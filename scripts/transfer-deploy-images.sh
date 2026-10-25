#!/bin/sh
set -eu

: "${DEPLOY_HOST:?}" "${DEPLOY_USER:?}" "${DEPLOY_PATH:?}" "${RELEASE_SHA:?}" "${CI_REGISTRY_IMAGE:?}"
case "$DEPLOY_HOST" in *[!a-zA-Z0-9.:-]*|'') exit 2 ;; esac
case "$DEPLOY_USER" in *[!a-zA-Z0-9_-]*|'') exit 2 ;; esac
case "${DEPLOY_PORT:-22}" in *[!0-9]*|'') exit 2 ;; esac
case "$DEPLOY_PATH" in /*) ;; *) exit 2 ;; esac
case "$DEPLOY_PATH" in *[!a-zA-Z0-9_./-]*) exit 2 ;; esac
case "$CI_REGISTRY_IMAGE" in *[!a-zA-Z0-9_./:-]*|'') exit 2 ;; esac
case "$RELEASE_SHA" in *[!a-f0-9]*|'') exit 2 ;; esac
[ "${#RELEASE_SHA}" -eq 40 ] || exit 2
if ! awk -F= '
    BEGIN {
        split("ID MAIL I18N PERSON PERSON_WORKER RESTRICTIONS GATEWAY ID_WEB PERSON_WEB PERSON_ADMIN_WEB ASSETS MINIO", names, " ")
        for (i in names) allowed[names[i] "_IMAGE_TAG"] = 1
    }
    NF != 2 || !($1 in allowed) || seen[$1]++ || length($2) != 40 || $2 ~ /[^a-f0-9]/ { exit 1 }
    END { if (NR != 12) exit 1 }
' images.env; then
    printf 'Invalid image manifest.\n' >&2
    exit 2
fi

temporary=$(mktemp -d)
source_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
trap 'rm -rf "$temporary"' EXIT HUP INT TERM
target="$DEPLOY_USER@$DEPLOY_HOST"
remote() {
    ssh -p "${DEPLOY_PORT:-22}" -o BatchMode=yes -o StrictHostKeyChecking=yes "$target" "$@" < /dev/null
}
storage=$(remote "cat '$DEPLOY_PATH/shared/storage-profile'")
case "$storage" in external|local) ;; *) printf 'Unknown remote storage profile.\n' >&2; exit 2 ;; esac
while IFS='=' read -r variable tag; do
    name=$(printf '%s' "${variable%_IMAGE_TAG}" | tr 'A-Z_' 'a-z-')
    if [ "$name" = minio ] && [ "$storage" = external ]; then continue; fi
    image="$CI_REGISTRY_IMAGE/$name:$tag"
    if remote "docker image inspect '$image' >/dev/null 2>&1"; then continue; fi
    docker pull "$image"
    docker image save --output "$temporary/image.tar" "$image"
    expected=$(python3 "$source_dir/image-config-digest.py" "$temporary/image.tar")
    archive_hash=$(sha256sum "$temporary/image.tar" | cut -d ' ' -f 1)
    remote_archive="/tmp/persons-image-$RELEASE_SHA-$name.tar"
    scp -P "${DEPLOY_PORT:-22}" -o BatchMode=yes -o StrictHostKeyChecking=yes "$temporary/image.tar" "$target:$remote_archive"
    actual_hash=$(remote "sha256sum '$remote_archive'" | cut -d ' ' -f 1)
    if [ "$actual_hash" != "$archive_hash" ]; then
        remote "rm -f '$remote_archive'"
        printf 'Transferred archive checksum does not match: %s\n' "$name" >&2
        exit 1
    fi
    actual=$(ssh -p "${DEPLOY_PORT:-22}" -o BatchMode=yes -o StrictHostKeyChecking=yes "$target" \
        "set -eu; trap 'rm -f $remote_archive $remote_archive.verified' EXIT; docker image load --input '$remote_archive' >/dev/null; docker image save --output '$remote_archive.verified' '$image'; python3 - '$remote_archive.verified'" < "$source_dir/image-config-digest.py")
    if [ "$actual" != "$expected" ]; then
        printf 'Transferred image ID does not match registry: %s\n' "$name" >&2
        exit 1
    fi
    rm -f "$temporary/image.tar"
    printf 'Delivered and verified image: %s\n' "$name"
done < images.env
