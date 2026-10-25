#!/bin/sh
set -eu

if [ "$#" -ne 4 ]; then
    printf 'Usage: deploy-release.sh DEPLOY_PATH COMMIT_SHA IMAGE_PREFIX BUNDLE\n' >&2
    exit 2
fi
deployment_dir=$1
release_sha=$2
image_prefix=$3
bundle=$4
case "$deployment_dir" in /*) ;; *) printf 'DEPLOY_PATH must be absolute.\n' >&2; exit 2 ;; esac
case "$deployment_dir" in *[!a-zA-Z0-9_./-]*) exit 2 ;; esac
case "$release_sha" in *[!a-f0-9]*|'') exit 2 ;; esac
[ "${#release_sha}" -eq 40 ] || exit 2
case "$image_prefix" in *[!a-zA-Z0-9_./:-]*|'') exit 2 ;; esac

runtime_env="$deployment_dir/shared/.env"
if [ ! -f "$runtime_env" ]; then
    printf 'Create %s on the server before deploying. No runtime configuration was written.\n' "$runtime_env" >&2
    exit 1
fi
if [ "$(stat -c %a "$runtime_env")" != 600 ]; then
    printf 'Runtime configuration must have permissions 0600.\n' >&2
    exit 1
fi
resource_profile=standard
if [ -f "$deployment_dir/shared/resource-profile" ]; then
    resource_profile=$(cat "$deployment_dir/shared/resource-profile")
fi
case "$resource_profile" in standard|small) ;; *) printf 'Unknown resource profile.\n' >&2; exit 2 ;; esac
storage_profile=local
if [ -f "$deployment_dir/shared/storage-profile" ]; then
    storage_profile=$(cat "$deployment_dir/shared/storage-profile")
fi
case "$storage_profile" in local|external) ;; *) printf 'Unknown storage profile.\n' >&2; exit 2 ;; esac
mkdir -p "$deployment_dir/releases"
release_dir="$deployment_dir/releases/$release_sha"
if [ -d "$release_dir" ]; then
    printf 'Release directory already exists; use a new commit or inspect the previous attempt.\n' >&2
    exit 1
fi
mkdir "$release_dir"
tar -xzf "$bundle" -C "$release_dir"
# Never evaluate an artifact as shell code. Accept exactly one immutable tag per image.
if ! awk -F= '
    BEGIN {
        split("ID MAIL I18N PERSON PERSON_WORKER RESTRICTIONS GATEWAY ID_WEB PERSON_WEB PERSON_ADMIN_WEB ASSETS MINIO", names, " ")
        for (i in names) allowed[names[i] "_IMAGE_TAG"] = 1
    }
    NF != 2 || !($1 in allowed) || seen[$1]++ || length($2) != 40 || $2 ~ /[^a-f0-9]/ { exit 1 }
    END { if (NR != 12) exit 1 }
' "$release_dir/images.env"; then
    printf 'Invalid image manifest.\n' >&2
    exit 2
fi
ln -s "$runtime_env" "$release_dir/.env"
printf 'IMAGE_PREFIX=%s\nRELEASE_SHA=%s\n' "$image_prefix" "$release_sha" > "$release_dir/release.env"
cat "$release_dir/images.env" >> "$release_dir/release.env"
chmod 600 "$release_dir/release.env"
printf '%s\n' "$resource_profile" > "$release_dir/resource-profile"
printf '%s\n' "$storage_profile" > "$release_dir/storage-profile"
chmod +x "$release_dir/scripts/op"
cd "$release_dir"

compose() {
    if [ "$storage_profile" = external ]; then
        set -- -f docker/compose.external-s3.yaml "$@"
    fi
    if [ "$resource_profile" = small ]; then
        set -- -f docker/compose.small.yaml "$@"
    fi
    docker compose --project-name persons-production --env-file "$runtime_env" --env-file release.env \
        -f docker-compose.yaml -f docker/compose.production.yaml "$@" < /dev/null
}
compose config --quiet
# Relative bind mounts must not change a service's fingerprint merely because releases have different directories.
compose config --no-path-resolution --hash '*' > config.hashes
previous=$(readlink "$deployment_dir/current" || true)
if [ -n "$previous" ] && [ -f "$previous/config.hashes" ]; then
    cp "$previous/config.hashes" previous.hashes
elif [ -n "$previous" ] && [ -f "$previous/release.env" ]; then
    # One-time migration from a release made before selective deployment.
    (
        cd "$previous"
        storage_profile=local
        resource_profile=standard
        if [ -f storage-profile ]; then storage_profile=$(cat storage-profile); fi
        if [ -f resource-profile ]; then resource_profile=$(cat resource-profile); fi
        compose config --no-path-resolution --hash '*'
    ) > previous.hashes
else
    : > previous.hashes
fi
chmod 600 config.hashes previous.hashes
: > deployment-plan.txt
for service in postgres redis properties-redis minio minio-init i18n mail id restrictions person gateway id-web person-web person-admin-web person-worker; do
    if [ "$storage_profile" = external ] && [ "$service" = minio ]; then
        continue
    fi
    current_hash=$(awk -v service="$service" '$1 == service { print $2 }' config.hashes)
    previous_hash=$(awk -v service="$service" '$1 == service { print $2 }' previous.hashes)
    [ -n "$current_hash" ] || { printf 'Missing service configuration: %s\n' "$service" >&2; exit 2; }
    if [ "$current_hash" != "$previous_hash" ]; then
        printf '%s\n' "$service" >> deployment-plan.txt
    elif [ "$service" != minio-init ]; then
        container=$(compose ps --all --quiet "$service")
        state='missing'
        if [ -n "$container" ]; then
            state=$(docker inspect --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container")
        fi
        case "$state" in 'running healthy'|'running none') ;; *) printf '%s\n' "$service" >> deployment-plan.txt ;; esac
    fi
done
if [ -s deployment-plan.txt ]; then
    printf 'Updating services:\n'
    cat deployment-plan.txt
    set --
    while IFS= read -r service; do set -- "$@" "$service"; done < deployment-plan.txt
    # Tags identify immutable build inputs; verified images may already be delivered by CI.
    compose --parallel 1 pull --policy missing "$@"
    legacy_worker=''
    if grep -qx person-worker deployment-plan.txt || {
        grep -qx restrictions deployment-plan.txt && [ ! -f "$deployment_dir/shared/restrictions-migrated" ]
    }; then
        legacy_worker=$(docker ps --filter label=com.docker.compose.project=persons-production \
            --filter label=com.docker.compose.service=personal-worker --format '{{.ID}}')
        if [ -n "$legacy_worker" ]; then
            printf 'Stopping renamed legacy worker before updating its dependencies.\n'
            docker stop --timeout 45 "$legacy_worker"
        fi
    fi
    # Do not traverse depends_on: unrelated backends and storage must stay running.
    # Migrations run on startup; never attempt a blind rollback of the database schema.
    while IFS= read -r service; do
        if [ "$service" = restrictions ]; then
            database_exists=$(compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U persons -d postgres \
                -Atc "SELECT 1 FROM pg_database WHERE datname='restrictions'")
            if [ "$database_exists" != 1 ]; then
                compose exec -T postgres createdb -U persons restrictions
            fi
        fi
        if [ "$service" = minio-init ]; then
            compose up --no-build --no-deps --force-recreate --exit-code-from minio-init minio-init
        else
            if ! compose up -d --no-build --no-deps --wait --wait-timeout 300 "$service"; then
                printf 'Service failed its health check: %s\n' "$service" >&2
                if ! compose ps --all "$service" >&2; then
                    printf 'Could not inspect container state for %s.\n' "$service" >&2
                fi
                if ! compose logs --no-color --tail 100 "$service" >&2; then
                    printf 'Could not read container logs for %s.\n' "$service" >&2
                fi
                exit 1
            fi
        fi
        if [ "$service" = restrictions ] && [ ! -f "$deployment_dir/shared/restrictions-migrated" ]; then
            # Freeze legacy writers before the one-time data ownership transfer.
            old_person=$(compose ps --all --quiet person)
            old_worker=$(compose ps --all --quiet person-worker)
            compose stop --timeout 45 person person-worker
            if ! sh "$release_dir/scripts/migrate-restrictions.sh" "$deployment_dir"; then
                if [ -n "$old_person" ]; then docker start "$old_person"; fi
                if [ -n "$old_worker" ]; then docker start "$old_worker"; fi
                if [ -n "$legacy_worker" ]; then docker start "$legacy_worker"; fi
                printf 'Restriction migration failed; legacy writers restored.\n' >&2
                exit 1
            fi
            # A lost marker can require verification during a restrictions-only release.
            # Restore unchanged writers too; they were not selected by the original plan.
            if [ -n "$old_person" ] && ! grep -qx person deployment-plan.txt; then
                compose up -d --no-build --no-deps --wait --wait-timeout 300 person
            fi
            if [ -n "$old_worker" ] && ! grep -qx person-worker deployment-plan.txt; then
                compose up -d --no-build --no-deps --wait --wait-timeout 300 person-worker
            fi
        fi
    done < deployment-plan.txt
else
    printf 'Service images and configuration unchanged; containers preserved.\n'
fi
if [ -n "$previous" ]; then
    ln -sfn "$previous" "$deployment_dir/previous"
fi
ln -s "$release_dir" "$deployment_dir/current.next"
mv -Tf "$deployment_dir/current.next" "$deployment_dir/current"
printf 'Healthy release deployed: %s\n' "$release_sha"
