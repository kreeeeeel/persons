# Profile statuses, authors and tag dictionary

The shared site/CMS editor has eight sections: main details, avatar, account linking, description and tags, military service, contact status, search, and social networks. Unsaved fields survive section changes. Avatar and linking reuse existing dialogs; creation saves the profile first. Mobile uses a section selector.

`PersonProfile.presence` contains `status` (`MISSING` or `UNRESPONSIVE`) and calendar `since`. Both are required together; future dates are rejected. Omitting `presence` in `ProfileInput` preserves it; `{}` clears it. The borderless notice appears below the timer without affecting permissions.

`linkedAccount` exposes only public `id`, `handle`, `fullName`, and `avatarUrl`, without email or account settings. Its card links to author publications. The restriction service supplies `restriction`: one notice above the description shows the profile name, reason and expiry. Its borderless information button reveals scopes on hover, focus or click. A full restriction strikes through the name. Restriction-service failures return 503.

## Publications

`GET /v1/authors/me` returns the current author's public identity; `GET /v1/authors/by-handle/{handle}` resolves a participant. Handles are published linked profile tags or account UUIDs. `GET /v1/publications/by-author/{handle}` accepts `kind`, `page`, and `size`; downward scrolling appends pages. `/v1/publications/mine` remains available.

`/{locale}/publications/{handle}` shows avatar, name and published contributions. Visitors cannot see another author's pending posts, drafts, deleted records or content on unpublished profiles. Authors retain their own pending posts. Reactions and editing permissions belong to the viewer.

## Dictionary

`GET /v1/tag-definitions` returns definitions. CMS `/{locale}/tag-dictionary` atomically replaces the dictionary using administrator-only `PUT /v1/admin/tag-definitions`. Limits are 200 tags, 32 characters per tag, and 500 per ru/en description. Tags normalize to lowercase; duplicates reject the entire update. Comments, reviews and loans render safe React text and hashtags without HTML injection. Definitions support hover, focus and touch; unknown tags have no invented meanings.

## Dota rank and deployment

OpenDota parsing reads the selected player's `players[].rank_tier`, never match `average_rank`. Missing or invalid ranks remain absent. Medal names support ru/en. Flyway V28 adds presence, the dictionary, and a verified-rank flag. Unverified old ranks stay hidden; the worker repairs up to five matches during scheduled integration updates while preserving statistics and inventory.

Person requires `RESTRICTIONS_BASE_URL` and the trusted shared service JWT; Compose supplies the address. Back up the database before production migration. No demonstration data is inserted.

Validation includes both frontend `npm run check` suites, Person API, worker, gateway, dotabuff-integration tests, and `E2E_REAL_PROFILE=true npx playwright test community-profile.spec.ts profile-release.spec.ts site-notices.spec.ts` against the isolated local stack. Mutation tests must not run against production.
