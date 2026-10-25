#!/bin/sh
set -eu

source_dir=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT HUP INT TERM
mkdir -p "$temporary/workspace/scripts" "$temporary/workspace/docker/nginx" "$temporary/workspace/docker/postgres" "$temporary/bin"
cp "$source_dir/scripts/ci-deploy.sh" "$temporary/workspace/scripts/ci-deploy.sh"
for script in op op.sql install-op.sh deploy-release.sh render-nginx.sh migrate-restrictions.sh; do
    cp "$source_dir/scripts/$script" "$temporary/workspace/scripts/$script"
done
touch "$temporary/workspace/docker-compose.yaml" "$temporary/workspace/docker/compose.production.yaml" "$temporary/workspace/docker/compose.small.yaml" "$temporary/workspace/docker/compose.external-s3.yaml"
printf 'fixture runtime secret\n' > "$temporary/workspace/.env"
printf 'infrastructure 0123456789012345678901234567890123456789\n' > "$temporary/workspace/workspace.lock"
printf 'PERSON_WEB_IMAGE_TAG=0123456789012345678901234567890123456789\n' > "$temporary/workspace/images.env"
cat > "$temporary/bin/scp" <<'SH'
#!/bin/sh
printf '%s\n' "$*" > "$BUNDLE_TEST_DIR/scp.args"
for argument in "$@"; do
    if [ -f "$argument" ]; then cp "$argument" "$BUNDLE_TEST_DIR/bundle.tar.gz"; fi
done
SH
cat > "$temporary/bin/ssh" <<'SH'
#!/bin/sh
printf '%s\n' "$*" > "$BUNDLE_TEST_DIR/ssh.args"
cat > "$BUNDLE_TEST_DIR/remote-script"
SH
chmod +x "$temporary/bin/scp" "$temporary/bin/ssh"
export PATH="$temporary/bin:$PATH" BUNDLE_TEST_DIR="$temporary"
export DEPLOY_HOST=example.test DEPLOY_USER=deploy DEPLOY_PATH=/opt/persons
export CI_REGISTRY_IMAGE=registry.example.test/group/infrastructure
export CI_COMMIT_SHA=0123456789012345678901234567890123456789
export RELEASE_SHA=1123456789012345678901234567890123456789
cd "$temporary/workspace"
sh scripts/ci-deploy.sh
grep -Fq "$RELEASE_SHA" "$temporary/ssh.args"
grep -Fq "$RELEASE_SHA.tar.gz" "$temporary/scp.args"
if grep -Fq "$CI_COMMIT_SHA" "$temporary/ssh.args"; then exit 1; fi
grep -Fq 'StrictHostKeyChecking=yes' "$temporary/ssh.args"
tar -tzf "$temporary/bundle.tar.gz" > "$temporary/contents"
grep -Fxq workspace.lock "$temporary/contents"
grep -Fxq images.env "$temporary/contents"
grep -Fxq scripts/render-nginx.sh "$temporary/contents"
grep -Fxq scripts/migrate-restrictions.sh "$temporary/contents"
grep -Fxq docker/compose.small.yaml "$temporary/contents"
grep -Fxq docker/compose.external-s3.yaml "$temporary/contents"
if grep -Fxq .env "$temporary/contents"; then exit 1; fi
cmp scripts/deploy-release.sh "$temporary/remote-script"
export RELEASE_SHA=invalid
if sh scripts/ci-deploy.sh > "$temporary/error" 2>&1; then exit 1; fi
printf 'deploy bundle: release fingerprint, source lock, secret exclusion and SSH checks passed.\n'
