#!/bin/sh
set -eu

source_dir=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT HUP INT TERM
export GIT_ALLOW_PROTOCOL=file
unset UPSTREAM_PROJECT UPSTREAM_SHA UPSTREAM_RELEASE
export CI_COMMIT_SHA=0123456789012345678901234567890123456789

mkdir -p "$temporary/workspace/ci"
cp "$source_dir/ci/workspace.sh" "$temporary/workspace/ci/workspace.sh"
printf 'backend/one\nfrontend/two\n' > "$temporary/workspace/ci/projects.txt"

for name in one two; do
    git init --quiet --bare "$temporary/$name.git"
    git init --quiet --initial-branch=main "$temporary/$name"
    git -C "$temporary/$name" config user.name 'Workspace test'
    git -C "$temporary/$name" config user.email 'test@example.test'
    printf 'initial\n' > "$temporary/$name/content"
    git -C "$temporary/$name" add content
    git -C "$temporary/$name" commit --quiet -m 'Initial'
    git -C "$temporary/$name" remote add origin "$temporary/$name.git"
    git -C "$temporary/$name" push --quiet origin main
    git --git-dir="$temporary/$name.git" symbolic-ref HEAD refs/heads/main
done

cd "$temporary/workspace"
git init --quiet --initial-branch=main
git config user.name 'Workspace test'
git config user.email 'test@example.test'
git submodule add --quiet "$temporary/one.git" backend/one
git submodule add --quiet "$temporary/two.git" frontend/two
git add ci .gitmodules backend/one frontend/two
git commit --quiet -m 'Workspace'
first_revision=$(git -C backend/one rev-parse HEAD)

printf 'updated\n' >> "$temporary/one/content"
git -C "$temporary/one" commit --quiet -am 'Update main'
git -C "$temporary/one" push --quiet origin main
second_revision=$(git -C "$temporary/one" rev-parse HEAD)
sh ci/workspace.sh resolve
grep -Fqx "backend/one $second_revision" workspace.lock
grep -Fqx "infrastructure $CI_COMMIT_SHA" workspace.lock
grep -Fqx "RELEASE_SHA=$(git hash-object workspace.lock)" release.env
cp workspace.lock "$temporary/locked"

# Reused runner workspaces retain objects while Git configuration is cleaned.
git config --local --remove-section submodule.backend/one
git config --local --remove-section submodule.frontend/two
git -C backend/one config --local --remove-section remote.origin
git -C frontend/two config --local --remove-section remote.origin
sh ci/workspace.sh checkout
[ "$(git -C backend/one remote get-url origin)" = "$temporary/one.git" ]
[ "$(git -C frontend/two remote get-url origin)" = "$temporary/two.git" ]

# A later push must not change the versions used by the remaining jobs.
printf 'later\n' >> "$temporary/one/content"
git -C "$temporary/one" commit --quiet -am 'Later main'
git -C "$temporary/one" push --quiet origin main
sh ci/workspace.sh checkout
[ "$(git -C backend/one rev-parse HEAD)" = "$second_revision" ]
cmp workspace.lock "$temporary/locked"

export UPSTREAM_PROJECT=te-eshche-lyudi/backend/one UPSTREAM_SHA="$first_revision" UPSTREAM_RELEASE=true
sh ci/workspace.sh resolve
grep -Fqx "backend/one $first_revision" workspace.lock
grep -Fqx "RELEASE_SHA=$(git hash-object workspace.lock)" release.env
sh ci/workspace.sh checkout
[ "$(git -C backend/one rev-parse HEAD)" = "$first_revision" ]

expect_failure() {
    if sh ci/workspace.sh "$1" > "$temporary/error" 2>&1; then
        printf 'Expected failure: %s\n' "$2" >&2
        exit 1
    fi
    grep -Fq "$2" "$temporary/error"
}

export UPSTREAM_PROJECT=te-eshche-lyudi/../outside
expect_failure resolve 'Unknown upstream project.'
export UPSTREAM_PROJECT=another-group/backend/one
expect_failure resolve 'Unknown upstream namespace.'
export UPSTREAM_PROJECT=te-eshche-lyudi/backend/one UPSTREAM_SHA=invalid
expect_failure resolve 'A full commit SHA is required.'
unset UPSTREAM_PROJECT
expect_failure resolve 'An upstream SHA requires an upstream project.'
unset UPSTREAM_SHA

git -C "$temporary/one" checkout --quiet -b feature "$first_revision"
printf 'feature\n' >> "$temporary/one/content"
git -C "$temporary/one" commit --quiet -am 'Feature'
git -C "$temporary/one" push --quiet origin feature
UPSTREAM_SHA=$(git -C "$temporary/one" rev-parse HEAD)
export UPSTREAM_PROJECT=te-eshche-lyudi/backend/one UPSTREAM_SHA
expect_failure resolve 'Only main commits can be released.'
export UPSTREAM_RELEASE=false
sh ci/workspace.sh resolve
grep -Fqx "backend/one $UPSTREAM_SHA" workspace.lock
sh ci/workspace.sh checkout
[ "$(git -C backend/one rev-parse HEAD)" = "$UPSTREAM_SHA" ]

printf 'infrastructure %s\nbackend/one invalid\nfrontend/two %s\n' "$CI_COMMIT_SHA" "$first_revision" > workspace.lock
expect_failure checkout 'A full commit SHA is required.'
printf 'infrastructure %s\nfrontend/two %s\nbackend/one %s\n' "$CI_COMMIT_SHA" "$first_revision" "$first_revision" > workspace.lock
expect_failure checkout 'The workspace lock does not match the manifest.'
printf 'workspace: exact revisions, release identity, source validation and immutable checkout passed.\n'
