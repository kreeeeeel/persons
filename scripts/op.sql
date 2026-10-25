BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '30s';

-- Use the same administrator-before-target lock order as the ID administration service.
SELECT count(*) AS locked FROM (
    SELECT id FROM accounts WHERE role = 'ADMIN' ORDER BY id FOR UPDATE
) administrators \gset

SELECT EXISTS(SELECT 1 FROM accounts WHERE email = lower(btrim(:'email'))) AS account_exists \gset
\if :account_exists
\else
    DO $$ BEGIN RAISE EXCEPTION 'Account not found. Register and confirm this email first.'; END $$;
\endif

SELECT id, status = 'ACTIVE' AS active, role = 'ADMIN' AS administrator
FROM accounts WHERE email = lower(btrim(:'email')) FOR UPDATE \gset account_

\if :account_active
\else
    DO $$ BEGIN RAISE EXCEPTION 'The account is blocked. Its status has not been changed.'; END $$;
\endif

\if :account_administrator
    \echo The account is already an administrator. Existing sessions are unchanged.
\else
    UPDATE accounts SET role = 'ADMIN', version = version + 1 WHERE id = :'account_id'::uuid;
    UPDATE sessions SET revoked = true, version = version + 1
    WHERE user_id = :'account_id'::uuid AND NOT revoked AND expires_at > CURRENT_TIMESTAMP;
    \echo Administrator access granted. Sign in again to start a new session.
\endif
COMMIT;
