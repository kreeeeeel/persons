#!/bin/sh
set -eu

cd "$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
manifest=ci/projects.txt
namespace=te-eshche-lyudi

fail() {
    printf '%s\n' "$1" >&2
    exit 2
}

validate_sha() {
    [ "${#1}" -eq 40 ] || fail 'A full commit SHA is required.'
    case "$1" in *[!0-9a-f]*) fail 'Invalid commit SHA.' ;; esac
}

validate_manifest() {
    [ -s "$manifest" ] || fail 'The workspace manifest is empty.'
    while IFS= read -r project; do
        case "$project" in backend/*|frontend/*) ;; *) fail 'Invalid project path.' ;; esac
        case "$project" in *[!a-z0-9/-]*|*..*|*//*|*/) fail 'Invalid project path.' ;; esac
        configured=$(git config -f .gitmodules "submodule.$project.path")
        [ "$configured" = "$project" ] || fail 'Manifest and submodules differ.'
    done < "$manifest"
    [ "$(sort "$manifest" | uniq -d | wc -l | tr -d ' ')" -eq 0 ] || fail 'Duplicate project path.'
}

initialize_submodules() {
    git submodule init
    # Runner cleanup removes cached remotes; restore them before fetching missing commits.
    git submodule sync --recursive
    git submodule update --init --recursive
}

resolve() {
    infrastructure_sha=${CI_COMMIT_SHA:-$(git rev-parse HEAD)}
    target=''
    if [ -n "${UPSTREAM_PROJECT:-}" ]; then
        case "$UPSTREAM_PROJECT" in "$namespace"/*) target=${UPSTREAM_PROJECT#"$namespace"/} ;; *) fail 'Unknown upstream namespace.' ;; esac
        # Keep the existing GitLab repository usable after the local worker rename.
        [ "$target" != backend/personal-worker ] || target=backend/person-worker
        grep -Fqx "$target" "$manifest" || fail 'Unknown upstream project.'
        validate_sha "${UPSTREAM_SHA:-}"
    elif [ -n "${UPSTREAM_SHA:-}" ]; then
        fail 'An upstream SHA requires an upstream project.'
    fi
    validate_sha "$infrastructure_sha"
    initialize_submodules
    temporary=$(mktemp)
    trap 'rm -f "$temporary"' EXIT HUP INT TERM
    printf 'infrastructure %s\n' "$infrastructure_sha" > "$temporary"
    while IFS= read -r project; do
        git -C "$project" fetch --quiet --no-tags origin main
        revision=$(git -C "$project" rev-parse FETCH_HEAD)
        if [ "$project" = "$target" ]; then
            main_revision=$revision
            git -C "$project" fetch --quiet --no-tags origin "$UPSTREAM_SHA"
            revision=$(git -C "$project" rev-parse FETCH_HEAD)
            [ "$revision" = "$UPSTREAM_SHA" ] || fail 'The upstream revision differs.'
            if [ "${UPSTREAM_RELEASE:-false}" = true ]; then
                git -C "$project" merge-base --is-ancestor "$revision" "$main_revision" || fail 'Only main commits can be released.'
            fi
        fi
        validate_sha "$revision"
        printf '%s %s\n' "$project" "$revision" >> "$temporary"
    done < "$manifest"
    mv "$temporary" workspace.lock
    release_sha=$(git hash-object workspace.lock)
    printf 'RELEASE_SHA=%s\n' "$release_sha" > release.env
}

checkout_lock() {
    [ -s workspace.lock ] || fail 'The workspace lock is missing.'
    IFS=' ' read -r root_project root_revision extra < workspace.lock
    if [ "$root_project" != infrastructure ] || [ -n "$extra" ]; then
        fail 'Invalid infrastructure revision.'
    fi
    validate_sha "$root_revision"
    [ "$root_revision" = "${CI_COMMIT_SHA:-$(git rev-parse HEAD)}" ] || fail 'The lock belongs to another infrastructure revision.'
    tail -n +2 workspace.lock | cut -d ' ' -f 1 > .workspace-paths.tmp
    if ! cmp -s "$manifest" .workspace-paths.tmp; then
        rm -f .workspace-paths.tmp
        fail 'The workspace lock does not match the manifest.'
    fi
    rm -f .workspace-paths.tmp
    # Validate the entire artifact before fetching or checking out any component.
    while IFS=' ' read -r project revision extra; do
        [ -z "$extra" ] || fail 'Invalid workspace lock entry.'
        validate_sha "$revision"
    done < workspace.lock
    initialize_submodules
    while IFS=' ' read -r project revision; do
        [ "$project" != infrastructure ] || continue
        git -C "$project" fetch --quiet --no-tags origin "$revision"
        git -C "$project" checkout --quiet --detach "$revision"
    done < workspace.lock
}

validate_manifest
case "${1:-}" in
    resolve) resolve ;;
    checkout) checkout_lock ;;
    *) fail 'Usage: sh ci/workspace.sh resolve|checkout' ;;
esac
