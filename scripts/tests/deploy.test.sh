#!/bin/sh
set -eu
project_dir=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$project_dir"
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT HUP INT TERM
release_sha=0123456789012345678901234567890123456789
deployment_dir="$temporary/deployment"
image_prefix=registry.example.test/team/persons
mkdir -p "$temporary/bin"
cat > "$temporary/bin/docker" <<'SH'
#!/bin/sh
printf '%s\n' "$*" >> "$DEPLOY_TEST_CALLS"
# Compose exec attaches stdin even with -T; it must never consume the deployment plan.
case "$*" in *'exec -T postgres'*) cat > /dev/null ;; esac
case "$*" in
    *'config --no-path-resolution --hash '*) cat "$DEPLOY_TEST_HASHES" ;;
    *'ps --all --quiet '*) printf 'existing-container\n' ;;
    ps*label=com.docker.compose.service=personal-worker*) printf '%s\n' "${DEPLOY_TEST_LEGACY_WORKER:-}" ;;
    inspect*) printf '%s\n' "${DEPLOY_TEST_STATE:-running healthy}" ;;
    *'up -d'*' properties-redis') touch "$DEPLOY_TEST_PROPERTIES_READY"; exit "${DEPLOY_TEST_FAILURE:-0}" ;;
    *'up -d'*' person')
        if [ ! -f "$DEPLOY_TEST_PROPERTIES_READY" ]; then
            printf 'Required properties Redis has not been started.\n' >&2
            exit 1
        fi
        exit "${DEPLOY_TEST_FAILURE:-0}"
        ;;
    *'up -d'*|*'up --no-build'*) exit "${DEPLOY_TEST_FAILURE:-0}" ;;
esac
SH
chmod +x "$temporary/bin/docker"
export PATH="$temporary/bin:$PATH" DEPLOY_TEST_CALLS="$temporary/calls" DEPLOY_TEST_HASHES="$temporary/hashes"
export DEPLOY_TEST_PROPERTIES_READY="$temporary/properties-ready" DEPLOY_TEST_LEGACY_WORKER=legacy-worker
services='postgres redis properties-redis minio minio-init i18n mail id restrictions person gateway id-web person-web person-admin-web person-worker'
for service in $services; do printf '%s original-hash\n' "$service"; done > "$DEPLOY_TEST_HASHES"

if sh scripts/deploy-release.sh "$deployment_dir" "$release_sha" "$image_prefix" "$temporary/bundle" > "$temporary/result" 2>&1; then exit 1; fi
grep -q 'No runtime configuration was written' "$temporary/result"
[ ! -e "$deployment_dir" ]
[ ! -e "$DEPLOY_TEST_CALLS" ]

mkdir -p "$deployment_dir/shared" "$deployment_dir/releases/previous" "$temporary/bundle/scripts"
printf 'fixture=preserve-me\n' > "$deployment_dir/shared/.env"
chmod 600 "$deployment_dir/shared/.env"
cp "$deployment_dir/shared/.env" "$temporary/original"
ln -s "$deployment_dir/releases/previous" "$deployment_dir/current"
cp scripts/op "$temporary/bundle/scripts/op"
cat > "$temporary/bundle/scripts/migrate-restrictions.sh" <<'SH'
#!/bin/sh
printf 'migration\n' >> "$DEPLOY_TEST_CALLS"
if [ "${DEPLOY_TEST_MIGRATION_FAILURE:-0}" = 1 ]; then exit 1; fi
touch "$1/shared/restrictions-migrated"
SH
for name in ID MAIL I18N PERSON PERSON_WORKER RESTRICTIONS GATEWAY ID_WEB PERSON_WEB PERSON_ADMIN_WEB ASSETS MINIO; do
    printf '%s_IMAGE_TAG=%s\n' "$name" "$release_sha"
done > "$temporary/bundle/images.env"
tar -czf "$temporary/release.tar.gz" -C "$temporary/bundle" .

# Failed health checks must never advance current or rewrite runtime secrets.
export DEPLOY_TEST_FAILURE=1
if sh scripts/deploy-release.sh "$deployment_dir" "$release_sha" "$image_prefix" "$temporary/release.tar.gz" > "$temporary/result" 2>&1; then exit 1; fi
[ "$(readlink "$deployment_dir/current")" = "$deployment_dir/releases/previous" ]
cmp "$temporary/original" "$deployment_dir/shared/.env"
grep -q 'Service failed its health check: postgres' "$temporary/result"
grep -q 'logs --no-color --tail 100 postgres$' "$DEPLOY_TEST_CALLS"

unset DEPLOY_TEST_FAILURE
release_sha=1123456789012345678901234567890123456789
: > "$DEPLOY_TEST_CALLS"
sh scripts/deploy-release.sh "$deployment_dir" "$release_sha" "$image_prefix" "$temporary/release.tar.gz" > "$temporary/result"
grep -q 'Healthy release deployed' "$temporary/result"
[ "$(readlink "$deployment_dir/current")" = "$deployment_dir/releases/$release_sha" ]
[ "$(readlink "$deployment_dir/previous")" = "$deployment_dir/releases/previous" ]
cmp "$temporary/original" "$deployment_dir/shared/.env"
grep -q "RELEASE_SHA=$release_sha" "$deployment_dir/current/release.env"
grep -q '^PERSON_WEB_IMAGE_TAG=' "$deployment_dir/current/release.env"
[ "$(stat -c %a "$deployment_dir/current/release.env")" = 600 ]
printf '%s\n' $services > "$temporary/expected"
cmp "$temporary/expected" "$deployment_dir/current/deployment-plan.txt"
grep -q 'up --no-build --no-deps --force-recreate --exit-code-from minio-init minio-init' "$DEPLOY_TEST_CALLS"
grep -q '^stop --timeout 45 legacy-worker$' "$DEPLOY_TEST_CALLS"
grep -q 'up -d --no-build --no-deps --wait --wait-timeout 300 properties-redis$' "$DEPLOY_TEST_CALLS"
if sh scripts/deploy-release.sh "$deployment_dir" "$release_sha" "$image_prefix" "$temporary/release.tar.gz" > "$temporary/result" 2>&1; then exit 1; fi
grep -q 'already exists' "$temporary/result"

# Frontend-only updates must not pull or recreate backend, PostgreSQL, MinIO or assets.
sed 's/^person-web .*/person-web frontend-change/' "$DEPLOY_TEST_HASHES" > "$temporary/next-hashes"
mv "$temporary/next-hashes" "$DEPLOY_TEST_HASHES"
release_sha=2123456789012345678901234567890123456789
: > "$DEPLOY_TEST_CALLS"
sh scripts/deploy-release.sh "$deployment_dir" "$release_sha" "$image_prefix" "$temporary/release.tar.gz" > "$temporary/result"
printf 'person-web\n' > "$temporary/expected"
cmp "$temporary/expected" "$deployment_dir/current/deployment-plan.txt"
[ "$(grep -c ' pull ' "$DEPLOY_TEST_CALLS")" -eq 1 ]
grep -q ' pull --policy missing person-web$' "$DEPLOY_TEST_CALLS"
[ "$(grep -c 'up -d' "$DEPLOY_TEST_CALLS")" -eq 1 ]
grep -q 'up -d --no-build --no-deps --wait --wait-timeout 300 person-web$' "$DEPLOY_TEST_CALLS"
if grep -q '^stop ' "$DEPLOY_TEST_CALLS"; then exit 1; fi

# Metadata/docs-only releases must not pull or restart any running service.
release_sha=3123456789012345678901234567890123456789
: > "$DEPLOY_TEST_CALLS"
sh scripts/deploy-release.sh "$deployment_dir" "$release_sha" "$image_prefix" "$temporary/release.tar.gz" > "$temporary/result"
[ ! -s "$deployment_dir/current/deployment-plan.txt" ]
if grep -Eq ' pull| up ' "$DEPLOY_TEST_CALLS"; then exit 1; fi
grep -q 'containers preserved' "$temporary/result"

# Unhealthy unchanged services are repaired; configuration/profile changes are applied.
release_sha=4123456789012345678901234567890123456789
export DEPLOY_TEST_STATE='running unhealthy'
printf 'small\n' > "$deployment_dir/shared/resource-profile"
: > "$DEPLOY_TEST_CALLS"
sh scripts/deploy-release.sh "$deployment_dir" "$release_sha" "$image_prefix" "$temporary/release.tar.gz" > "$temporary/result"
grep -q -- '-f docker/compose.small.yaml --parallel 1 pull' "$DEPLOY_TEST_CALLS"
[ "$(grep -c 'up -d --no-build --no-deps' "$DEPLOY_TEST_CALLS")" -eq 14 ]
unset DEPLOY_TEST_STATE

# External S3 must never start or repair a local MinIO server.
release_sha=7123456789012345678901234567890123456789
printf 'external\n' > "$deployment_dir/shared/storage-profile"
sed 's/^minio-init .*/minio-init external-assets/; s/^minio .*/minio excluded-storage/' "$DEPLOY_TEST_HASHES" > "$temporary/external-hashes"
mv "$temporary/external-hashes" "$DEPLOY_TEST_HASHES"
export DEPLOY_TEST_STATE='running unhealthy'
: > "$DEPLOY_TEST_CALLS"
sh scripts/deploy-release.sh "$deployment_dir" "$release_sha" "$image_prefix" "$temporary/release.tar.gz" > "$temporary/result"
grep -q -- '-f docker/compose.external-s3.yaml' "$DEPLOY_TEST_CALLS"
if grep -qx minio "$deployment_dir/current/deployment-plan.txt"; then exit 1; fi
grep -qx minio-init "$deployment_dir/current/deployment-plan.txt"
[ "$(grep -c 'up -d --no-build --no-deps' "$DEPLOY_TEST_CALLS")" -eq 13 ]
[ "$(cat "$deployment_dir/current/storage-profile")" = external ]
unset DEPLOY_TEST_STATE

printf 'invalid\n' > "$deployment_dir/shared/storage-profile"
release_sha=8123456789012345678901234567890123456789
if sh scripts/deploy-release.sh "$deployment_dir" "$release_sha" "$image_prefix" "$temporary/release.tar.gz" > "$temporary/result" 2>&1; then exit 1; fi
grep -q 'Unknown storage profile' "$temporary/result"
[ ! -e "$deployment_dir/releases/$release_sha" ]
printf 'external\n' > "$deployment_dir/shared/storage-profile"

# Missing ownership markers must freeze legacy writers, restore them on failure,
# and restart unchanged writers after a successful restrictions-only verification.
rm "$deployment_dir/shared/restrictions-migrated"
sed 's/^restrictions .*/restrictions policy-change/' "$DEPLOY_TEST_HASHES" > "$temporary/policy-hashes"
mv "$temporary/policy-hashes" "$DEPLOY_TEST_HASHES"
previous_release=$(readlink "$deployment_dir/current")
release_sha=9123456789012345678901234567890123456789
export DEPLOY_TEST_MIGRATION_FAILURE=1
: > "$DEPLOY_TEST_CALLS"
if sh scripts/deploy-release.sh "$deployment_dir" "$release_sha" "$image_prefix" "$temporary/release.tar.gz" > "$temporary/result" 2>&1; then exit 1; fi
grep -q 'legacy writers restored' "$temporary/result"
grep -q 'stop --timeout 45 person person-worker' "$DEPLOY_TEST_CALLS"
[ "$(grep -c '^start existing-container$' "$DEPLOY_TEST_CALLS")" -eq 2 ]
grep -q '^start legacy-worker$' "$DEPLOY_TEST_CALLS"
[ "$(readlink "$deployment_dir/current")" = "$previous_release" ]
[ ! -f "$deployment_dir/shared/restrictions-migrated" ]
unset DEPLOY_TEST_MIGRATION_FAILURE
release_sha=a123456789012345678901234567890123456789
: > "$DEPLOY_TEST_CALLS"
sh scripts/deploy-release.sh "$deployment_dir" "$release_sha" "$image_prefix" "$temporary/release.tar.gz" > "$temporary/result"
printf 'restrictions\n' > "$temporary/expected"
cmp "$temporary/expected" "$deployment_dir/current/deployment-plan.txt"
grep -q 'up -d --no-build --no-deps --wait --wait-timeout 300 person$' "$DEPLOY_TEST_CALLS"
grep -q 'up -d --no-build --no-deps --wait --wait-timeout 300 person-worker$' "$DEPLOY_TEST_CALLS"
[ -f "$deployment_dir/shared/restrictions-migrated" ]

# Artifact validation rejects duplicates and executable/non-SHA values before Docker is used.
release_sha=5123456789012345678901234567890123456789
printf 'ID_IMAGE_TAG=invalid\n' >> "$temporary/bundle/images.env"
tar -czf "$temporary/invalid.tar.gz" -C "$temporary/bundle" .
: > "$DEPLOY_TEST_CALLS"
if sh scripts/deploy-release.sh "$deployment_dir" "$release_sha" "$image_prefix" "$temporary/invalid.tar.gz" > "$temporary/result" 2>&1; then exit 1; fi
grep -q 'Invalid image manifest' "$temporary/result"
[ ! -s "$DEPLOY_TEST_CALLS" ]

printf 'invalid\n' > "$deployment_dir/shared/resource-profile"
release_sha=6123456789012345678901234567890123456789
if sh scripts/deploy-release.sh "$deployment_dir" "$release_sha" "$image_prefix" "$temporary/release.tar.gz" > "$temporary/result" 2>&1; then exit 1; fi
[ ! -e "$deployment_dir/releases/$release_sha" ]
grep -q 'Unknown resource profile' "$temporary/result"
printf 'deploy: bootstrap, frontend-only/no-op deployment, health repair, profiles, manifest validation and secret preservation passed.\n'
