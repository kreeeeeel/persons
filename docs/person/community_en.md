# Community interactions

`backend/person` now hosts both public and administrative endpoints. Account administration forwards to ID after checking current administrator permissions. The separate person-admin backend is retired.

Comment, review, loan, reaction and media authors use current ID account names and avatars, resolved in one batch per page. Stored names are a fallback for missing accounts; persona avatars do not replace account photographs. Account versions are included in avatar URLs, and responses are not cached. Changing a photograph refreshes loaded lists without clearing them or closing dialogs. Internal profile and avatar endpoints require a service JWT; the public BFF serves avatars only for project participants, without exposing email, roles or sessions.

Photo and video comments appear below the media and its details, with sorting aligned to the right above the comments. Large navigation arrows remain outside the dialog. Navigation replaces its content while keeping the dialog open.

Migration V4 adds rating comments, reaction author names, media views and publication flags for wall comments and loan entries. Rating scores and emoji update immediately; review text requires moderation. Authors see their own pending text with a review label, while other visitors see the latest approved version. Rejected new entries disappear from the author feed. Removing a rating cancels its pending comment.

Reaction counts open paginated author lists with avatars and links to published personas when available. Views are deduplicated per media, visitor and day. BFF assigns the visitor cookie and ignores browser-supplied IDs; PostgreSQL stores an HMAC. Media navigation stays within the same persona and media kind, including neighbors outside the current grid page.

Loan entries use `CreditKind`: `ON_TIME`, `SHORT_DELAY`, `LONG_DELAY`, `NOT_RETURNED`. Legacy values remain accepted for compatibility; V4 migrates existing entries. These are text reputation records without monetary amounts.

`GET /v1/persons/mine` returns the verified owned page or pending creation state. `POST /v1/persons/mine` submits a page request for moderation. One account has at most one active page; approved personal requests become verified. The account menu opens that page or a creation screen with the standard header. Email/password dialogs reuse existing ID endpoints and their session revocation rules.

The player, media viewer, ratings, wall, loans and empty illustrations are shared with the CMS through `frontend/libs`. Media appears above its title, publisher, reactions, tags and comments. Assets are uploaded to S3 by `minio-init`. The [generation manifest](../assets/community-generation.json) records final prompts and output paths. The eight hero scenes put people on the right and leave space for text on the left; Nikita uses the updated reference. The 404 image is preserved.

Validation: `./gradlew ktlintCheck test bootJar` in backend/person; `npm run check` and `npm run build` in both frontends; browser tests against the running Compose stack. Existing demo password sign-in is sufficient, without sending email through real SMTP.
