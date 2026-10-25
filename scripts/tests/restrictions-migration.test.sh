#!/bin/sh
set -eu
project_dir=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$project_dir"
temporary=$(mktemp -d)
container="persons-restrictions-migration-test-$(date +%s)-$$"
trap 'docker rm -fv "$container" >/dev/null 2>&1 || true; rm -rf "$temporary"' EXIT HUP INT TERM
docker run -d --name "$container" --tmpfs /var/lib/postgresql \
    -e POSTGRES_USER=persons -e POSTGRES_PASSWORD=fixture-database-password \
    --health-cmd 'pg_isready -U persons -d persons' --health-interval 1s --health-retries 40 postgres:18.3 > /dev/null
attempt=0
while [ "$(docker inspect --format '{{.State.Health.Status}}' "$container")" != healthy ]; do
    attempt=$((attempt + 1))
    [ "$attempt" -lt 40 ] || exit 1
    sleep 1
done
docker exec "$container" createdb -U persons person
docker exec "$container" createdb -U persons restrictions
schema="$temporary/schema.sql"
cat > "$schema" <<'SQL'
CREATE TABLE account_restrictions (
    id UUID PRIMARY KEY, user_id UUID NOT NULL UNIQUE, reason VARCHAR(1000) NOT NULL,
    created_by UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ, revoked BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE account_restriction_scopes (
    restriction_id UUID NOT NULL REFERENCES account_restrictions(id), scope VARCHAR(32) NOT NULL,
    PRIMARY KEY(restriction_id,scope)
);
SQL
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U persons -d person < "$schema" > /dev/null
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U persons -d restrictions \
    < backend/restrictions/app/api/src/main/resources/db/migration/V1__restrictions.sql > /dev/null
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U persons -d restrictions > /dev/null <<'SQL'
INSERT INTO account_policy_lock(id) VALUES (1);
SQL
deployment="$temporary/deployment"
mkdir -p "$deployment/shared"
sh scripts/migrate-restrictions.sh "$deployment" "$container" > /dev/null
[ -s "$deployment/shared/restrictions-migrated" ]
rm "$deployment/shared/restrictions-migrated"
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U persons -d person > /dev/null <<'SQL'
INSERT INTO account_restrictions(id,user_id,reason,created_by,created_at,expires_at,revoked) VALUES
('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',
 E'Пауза: "проверка"\nНовая строка и апостроф ''', '30000000-0000-0000-0000-000000000001',
 '2026-10-20 12:00:00+00',NULL,FALSE),
('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002',
 'Finite and revoked', '30000000-0000-0000-0000-000000000001',
 '2026-10-20 12:00:00+00','2026-10-20 13:00:00+00',TRUE);
INSERT INTO account_restriction_scopes(restriction_id,scope) VALUES
('10000000-0000-0000-0000-000000000001','COMMENTS'),
('10000000-0000-0000-0000-000000000001','RATINGS'),
('10000000-0000-0000-0000-000000000002','ACCOUNT');
SQL
sh scripts/migrate-restrictions.sh "$deployment" "$container" > /dev/null
[ "$(docker exec "$container" psql -X -U persons -d restrictions -Atc 'SELECT count(*) FROM account_restrictions')" = 2 ]
[ "$(docker exec "$container" psql -X -U persons -d restrictions -Atc 'SELECT count(*) FROM account_restriction_scopes')" = 3 ]
backup=$(find "$deployment/shared/migrations" -name person.dump)
[ -s "$backup" ]
[ "$(stat -c %a "$backup")" = 600 ]
# Losing the marker is safe when the complete contents still match.
rm "$deployment/shared/restrictions-migrated"
sh scripts/migrate-restrictions.sh "$deployment" "$container" > /dev/null
# A different destination must never be silently overwritten.
rm "$deployment/shared/restrictions-migrated"
docker exec "$container" psql -X -v ON_ERROR_STOP=1 -U persons -d restrictions \
    -c "UPDATE account_restrictions SET reason='A later policy edit' WHERE id='10000000-0000-0000-0000-000000000001'" > /dev/null
if sh scripts/migrate-restrictions.sh "$deployment" "$container" > "$temporary/failure" 2>&1; then exit 1; fi
grep -q 'refusing to overwrite' "$temporary/failure"
[ ! -f "$deployment/shared/restrictions-migrated" ]
printf 'restriction ownership: empty bootstrap, UTF-8/history/scopes, backup, idempotency and conflicting destination verified.\n'
