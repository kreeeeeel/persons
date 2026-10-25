#!/bin/sh
set -eu
umask 077

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
    printf 'Usage: migrate-restrictions.sh DEPLOY_PATH [POSTGRES_CONTAINER]\n' >&2
    exit 2
fi
deployment_dir=$1
postgres=${2:-persons-production-postgres-1}
case "$deployment_dir" in /*) ;; *) exit 2 ;; esac
case "$deployment_dir" in *[!a-zA-Z0-9_./-]*) exit 2 ;; esac
case "$postgres" in *[!a-zA-Z0-9_.-]*|''|-*) exit 2 ;; esac
marker="$deployment_dir/shared/restrictions-migrated"
if [ -f "$marker" ]; then
    printf 'Restriction ownership was already transferred.\n'
    exit 0
fi

query() {
    docker exec "$postgres" psql -X -v ON_ERROR_STOP=1 -U persons -d "$1" -Atc "$2"
}
rows_digest="SELECT md5(COALESCE(string_agg(row_to_json(t)::text, '' ORDER BY id), ''))
    FROM (SELECT id,user_id,reason,created_by,created_at,expires_at,revoked FROM public.account_restrictions) t"
scopes_digest="SELECT md5(COALESCE(string_agg(row_to_json(t)::text, '' ORDER BY restriction_id,scope), ''))
    FROM (SELECT restriction_id,scope FROM public.account_restriction_scopes) t"
if [ "$(query restrictions "SELECT to_regclass('public.account_restrictions') IS NOT NULL")" != t ]; then
    printf 'Start restrictions and let its Flyway schema initialize before transferring data.\n' >&2
    exit 1
fi
source_exists=$(query person "SELECT to_regclass('public.account_restrictions') IS NOT NULL")
if [ "$source_exists" = t ]; then
    source_rows=$(query person "$rows_digest")
    source_scopes=$(query person "$scopes_digest")
else
    source_rows=d41d8cd98f00b204e9800998ecf8427e
    source_scopes=$source_rows
fi
target_rows=$(query restrictions "$rows_digest")
target_scopes=$(query restrictions "$scopes_digest")
case "$source_rows$source_scopes" in *[!a-f0-9]*|'') exit 1 ;; esac
if [ "${#source_rows}" -ne 32 ] || [ "${#source_scopes}" -ne 32 ]; then exit 1; fi

if [ "$target_rows" != "$source_rows" ] || [ "$target_scopes" != "$source_scopes" ]; then
    if [ "$(query restrictions 'SELECT count(*) FROM public.account_restrictions')" != 0 ]; then
        printf 'Restrictions database contains a different policy history; refusing to overwrite it.\n' >&2
        exit 1
    fi
    backup_dir="$deployment_dir/shared/migrations/restrictions-$(date -u +%Y%m%dT%H%M%SZ)-$$"
    mkdir -p "$backup_dir"
    chmod 700 "$backup_dir"
    docker exec "$postgres" pg_dump -U persons -Fc person > "$backup_dir/person.dump"
    docker exec -i "$postgres" pg_restore --list < "$backup_dir/person.dump" > /dev/null
    printf 'SELECT id FROM public.account_policy_lock WHERE id=1 FOR UPDATE;\n' > "$backup_dir/transfer.sql"
    cat >> "$backup_dir/transfer.sql" <<'SQL'
DO $guard$ BEGIN
    IF EXISTS (SELECT 1 FROM public.account_restrictions) THEN
        RAISE EXCEPTION 'Restriction ownership transfer requires an empty destination';
    END IF;
END; $guard$;
SQL
    if [ "$source_exists" = t ]; then
        docker exec "$postgres" pg_dump -U persons -a --column-inserts \
            -t public.account_restrictions -t public.account_restriction_scopes person > "$backup_dir/data.sql"
        cat "$backup_dir/data.sql" >> "$backup_dir/transfer.sql"
    fi
    cat >> "$backup_dir/transfer.sql" <<SQL
DO \$verify\$ BEGIN
    IF ($rows_digest) <> '$source_rows' OR ($scopes_digest) <> '$source_scopes' THEN
        RAISE EXCEPTION 'Restriction ownership transfer content verification failed';
    END IF;
END; \$verify\$;
SQL
    docker exec -i "$postgres" psql -X -v ON_ERROR_STOP=1 -U persons -d restrictions \
        --single-transaction -f - < "$backup_dir/transfer.sql" > "$backup_dir/result.txt"
fi
printf 'rows=%s\nscopes=%s\n' "$source_rows" "$source_scopes" > "$marker.next"
mv "$marker.next" "$marker"
printf 'Restriction ownership transferred and content verified; legacy tables preserved.\n'
