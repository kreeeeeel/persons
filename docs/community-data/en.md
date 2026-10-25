# Real directory and feed data

`/{locale}/people` loads published, non-deleted pages through `GET /v1/persons/directory`. Names, avatars, views, published photo/moment counts and average ratings come from the database. Missing ratings display a dash. `VIEWS`, `RATING`, `NEWEST` and `NAME` ordering is applied before pagination, with a maximum page size of 60. Criteria queries avoid per-card statistics requests.

`/{locale}/feed` uses `GET /v1/feed` instead of demonstration page IDs. The server combines existing wall entries, media comments, ratings, loan reviews, photos, moments, achievements and Dota/CS matches. Historical publications appear immediately without an event backfill or database rewrite. All sources share server sorting and pagination. The optional kind filter runs before pagination; `GAME` includes both games. Equal timestamps use stable kind, page and source ID ordering. Payloads are fetched in batches for the selected page only.

Private/deleted pages, pending publications, hidden media and comments on them are excluded. CS snapshot expiry and Steam source checks remain enforced. Edit permissions and reaction states reflect the current viewer. The BFF forwards session and filters through generated clients with `private, no-store`. Failures show retry controls rather than an empty feed or sample fallback.

The notice ticker mounts once in `LocalizedContent`, covering the home page, profiles, directory, feed and other localized pages. Global settings, personal visibility, both themes and reduced motion remain supported. Content reserves its height at the bottom.

Directory/page fixtures live in `frontend/person/tests/fixtures`. ESLint prevents production modules from importing them. `COMMUNITY_PREVIEW` and scenario query parameters no longer control the production feed.

Coverage includes `CommunityReadIntegrationTest` (historical records, visibility, real statistics, ordering, pagination beyond 50 records, both games and invalid parameters), `loadFeedPage`, `DirectoryScreen`, BFF and shared ticker shell tests. To run the integration test on an isolated PostgreSQL database, set `COMMUNITY_TEST_DB_URL`, `COMMUNITY_TEST_DB_USER`, `COMMUNITY_TEST_DB_PASSWORD`; H2 is the default. Full checks: `./gradlew ktlintCheck test bootJar` in `backend/person`, `npm run check` and `npm run build:testing` in `frontend/person`.
