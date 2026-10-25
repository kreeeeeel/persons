# Automatic achievements and search

Internal public pages show compact search immediately after the logo. The landing page retains its large slider search only. Both variants use shared `PersonSearch`: two-character minimum, 350 ms debounce, stale request cancellation, skeletons, empty/error states, retry and keyboard navigation.

## Award methods

`AchievementType` is an OpenAPI/database enum: `MANUAL` or `AUTOMATIC`. Migration V10 preserves existing definitions as manual. Administrators choose the method when creating/editing a definition. Automatic definitions require `pageAgeYears` from 1 to 5; manual definitions omit it. The contract, service and database CHECK validate the rule. Older clients omitting both new update fields preserve an existing automatic rule.

Manual definitions support bulk grants to at most 100 personas per request and individual revocation. Only `person-worker` grants automatic definitions; the API rejects manual grants/revocation of them. Archiving hides existing awards and stops new grants. Changing a rule preserves previously earned awards.

## Job

`AutomaticAchievementJob` starts 30 seconds after startup and runs every five minutes. Configure ISO-8601 durations through `ACHIEVEMENTS_INITIAL_DELAY` and `ACHIEVEMENTS_DELAY`. Each run inserts at most 500 awards; remaining eligible pages are handled in subsequent runs.

Eligibility uses full calendar years from `persons.created_at` in UTC. A February 29 page reaches its anniversary on February 28 in a non-leap year at the same time. Every earned threshold is awarded, so a five-year page can collect all five anniversary badges. Unpublished/deleted pages and inactive/manual definitions are excluded. Publishing an older page makes it eligible on the next run.

A single transactional SQL statement selects a bounded batch and inserts awards. `FOR UPDATE SKIP LOCKED` coordinates definition edits and concurrent workers. The existing `(person_id, achievement_id)` unique constraint and `ON CONFLICT DO NOTHING` prevent duplicates. System awards have `assigned_by = NULL`; manual awards retain the administrator UUID.

## Catalog import

`frontend/assets/achievements/community-jokes.json` adds eleven manual definitions: long-liver (Nikita), dedicated Lil Peep listener, big person (Krel), smelly (Vadim), charming (Yurchik), under the heel and imprisoned (both featuring Evgeny), online footballer (Artem, REMATCH), dementia (Nikita), Dota player (Stepa), and Ural Dumplings fan (Vadim holding a sign celebrating the comedy show). The importer processes both catalogs and verifies all 20 images in S3; administrators choose recipients for the new manual awards.

`frontend/assets/achievements/anniversaries-and-habits.json` stores nine definitions and exact image prompts: anniversaries 1–5 years, drink lover, borrowing enthusiast and daylight avoider. Each badge is a separate transparent PNG. PostgreSQL stores definitions/rules and grants; the regular API uploads images to private S3.

After generating clients, run `node scripts/seed-achievements.mts` on Node 24 with `SEED_ID_URL`, `SEED_PERSON_URL`, `SEED_EMAIL`, `SEED_PASSWORD` and `PROJECT_INTERNAL_JWT_SECRET` in its environment. URLs target the gateway with `/id` and `/person` suffixes; direct Person requests are protected against bypassing the gateway. Use an SSH tunnel to the active production host. Never put credentials in command arguments or Git.

The importer only adds missing catalog definitions, preserves existing definitions, and grants no manual awards. Conflicting existing settings stop the import. It verifies every image byte-for-byte, creates no personas/accounts, and revokes its own session. A repeated run should report `created: 0`, `alreadyPresent: 20`.

## Verification

`npm test --prefix frontend/assets` checks catalog uniqueness, award rules, square PNG files and their alpha channel.

Run `./gradlew build ktlintCheck` in person and person-worker. Worker PostgreSQL tests require `WORKER_POSTGRES_TEST_URL` pointing to a disposable PostgreSQL 18 database named `worker_achievements_tests`, with username/password `tests`. Fixtures remove only their own records; never use production. CI starts this PostgreSQL service automatically.

Coverage includes exact anniversaries, leap day, all five thresholds, excluded pages/definitions, bounded batches, concurrent workers and repeated runs. Run `npm run check` in person and person-admin for shared search, header placement, award method editing and automatic award display tests.

The manual badge “Улетает со Старого Мельника” uses Vadim’s consented face reference. Its self-contained exact prompt is stored in the catalog under `fullPrompt`; the original reference photograph is excluded.
