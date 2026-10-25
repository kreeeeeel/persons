#!/bin/sh
# A separate disposable database; never touches a running project's accounts.
set -eu
project_dir=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$project_dir"
temporary=$(mktemp -d)
container="persons-op-test-$$"
docker_bin=$(command -v docker)
cleanup() {
    "$docker_bin" rm -f "$container" >/dev/null 2>&1 || true
    rm -rf "$temporary"
}
trap cleanup EXIT HUP INT TERM
"$docker_bin" run -d --name "$container" -e POSTGRES_USER=persons -e POSTGRES_DB=id \
    -e POSTGRES_HOST_AUTH_METHOD=trust postgres:18.3 >/dev/null
attempt=0
until "$docker_bin" exec "$container" pg_isready -h 127.0.0.1 -U persons -d id >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    [ "$attempt" -lt 30 ] || exit 1
    sleep 1
done
sql() { "$docker_bin" exec -i "$container" psql -X -U persons -d id -v ON_ERROR_STOP=1 "$@"; }
sql < backend/id/app/api/src/main/resources/db/migration/V1__create_id.sql >/dev/null
sql < backend/id/app/api/src/main/resources/db/migration/V5__roles_and_oauth.sql >/dev/null
sql <<'SQL' >/dev/null
INSERT INTO accounts (id,email,first_name,last_name,locale,password_hash,failed_logins,created_at,role,status)
VALUES ('00000000-0000-0000-0000-000000000001','o''connor@example.test','Test','Account','en','fixture',0,now(),'USER','ACTIVE'),
       ('00000000-0000-0000-0000-000000000002','blocked@example.test','Test','Blocked','en','fixture',0,now(),'USER','BLOCKED');
INSERT INTO sessions (id,user_id,token_hash,created_at,last_seen_at,expires_at,revoked,ip,user_agent,os,os_version,browser,device,origin)
VALUES ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','fixture',now(),now(),now()+interval '1 day',false,'','','','','','','');
SQL
export OP_TEST_DOCKER="$docker_bin" OP_TEST_CONTAINER="$container" OP_TEST_ARGUMENTS="$temporary/arguments"
cat > "$temporary/docker" <<'SH'
#!/bin/sh
printf '%s\n' "$@" > "$OP_TEST_ARGUMENTS"
exec "$OP_TEST_DOCKER" exec -i "$OP_TEST_CONTAINER" psql -X -U persons -d id --set=ON_ERROR_STOP=1 "--set=email=$OP_TEST_EMAIL" --file=-
SH
chmod +x "$temporary/docker"
export PATH="$temporary:$PATH"
export OP_TEST_EMAIL=" O'CONNOR@EXAMPLE.TEST "
sh scripts/op "$OP_TEST_EMAIL" > "$temporary/result"
grep -q 'Administrator access granted' "$temporary/result"
grep -q -- "--set=email=$OP_TEST_EMAIL" "$OP_TEST_ARGUMENTS"
[ "$(sql -Atc "SELECT role || ':' || version FROM accounts WHERE id='00000000-0000-0000-0000-000000000001'")" = 'ADMIN:1' ]
[ "$(sql -Atc 'SELECT revoked FROM sessions')" = t ]
sh scripts/op "$OP_TEST_EMAIL" > "$temporary/result"
grep -q 'already an administrator' "$temporary/result"
[ "$(sql -Atc "SELECT version FROM accounts WHERE id='00000000-0000-0000-0000-000000000001'")" = 1 ]
for email in missing@example.test blocked@example.test "bad'; DROP TABLE accounts; --@example.test"; do
    export OP_TEST_EMAIL="$email"
    if sh scripts/op "$email" > "$temporary/result" 2>&1; then
        printf 'Unexpected promotion: %s\n' "$email" >&2
        exit 1
    fi
done
[ "$(sql -Atc 'SELECT count(*) FROM accounts')" = 2 ]
[ "$(sql -Atc "SELECT role FROM accounts WHERE email='blocked@example.test'")" = USER ]
printf 'op: promotion, session revocation, idempotency, missing/blocked accounts and SQL quoting passed.\n'
