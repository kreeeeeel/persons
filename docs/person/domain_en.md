# Person domain

The CMS `/en/settings` page controls mandatory review independently for text (wall/media comments, rating reviews and loans), photos and moments. All switches default to enabled. Disabling review applies new submissions and their edits/removals synchronously through the existing moderation transaction; existing pending requests are not bulk-approved. “Users → Moderation” can force review for one account, overriding every global switch. Profiles, avatars and ownership proof always require review. Settings and their author are stored in PostgreSQL behind administrator-only APIs. Mutation receipts report the actual `PENDING` or `APPROVED` result.

Submissions lock the persona before inserting related records or issuing queries that can trigger a JPA flush. Automatic publication and manual review follow the same lock order, avoiding PostgreSQL FK lock upgrades to `FOR UPDATE` after concurrent inserts. Regression tests enforce this ordering.

The landing page uses the shared `PageLoader`, showing the active theme background and rotating logo while preloading and decoding all eight slide illustrations. A shared in-memory promise cache avoids duplicate loads; versioned public assets use a one-year immutable HTTP cache. Failed assets or a 12-second timeout release the page while pending loads continue. Private photos and API responses are excluded. Reduced-motion users see a static logo.

`backend/person` is a separate Kotlin/Spring service on 8085. Accounts remain in ID; personas have their own normalized tables for profiles, tags, social links, configurable emoji options/votes, wall/moment comments, media, photos, moments/likes, daily views, reputation entries, moderation and notifications.

Discord accepts a username or legacy `name#1234`, optionally prefixed with @. Its SocialLink uses `tag`, while Telegram/Steam use `url`. Combining both fields or using a tag for another network is invalid. Usernames are lowercased; legacy tags retain case. The Discord button displays and copies the tag, with visible copy errors. Existing Discord HTTPS links remain compatible. Tags use the existing PostgreSQL social contact row and normal profile moderation.

Username validation follows [Discord's rules](https://support.discord.com/hc/en-us/articles/12620128861463-New-Usernames-Display-Names): 2–32 characters, Latin letters, digits, periods and underscores, without consecutive periods.

Public URLs are `/{tag}`, rewritten internally to a localized Next.js route. Sign-in returns to the same persona. Search starts at two characters after 350 ms of inactivity and aborts obsolete requests. It includes keyboard navigation, skeletons, result totals and empty/error states.

Profile tabs and the modal session-card layout are copied from smart house, with text at least 16px. Social links are rounded icon-and-name buttons. Empty states use newly generated friend illustrations; the 404 page shows full-length Vadim pointing at a 404 sign.

All profile/account-link/content/comment/media/removal proposals require moderation. Public records stay intact until approval. Rejection requires a reason. Decisions produce private notifications. Optimistic profile versions reject stale proposals. Protected requests resolve the current revocable session and administrator role through ID.

Each account has one replaceable/removable rating from 1 to 5 per persona, with a chosen configured emoji. The API includes the average, total and current user's vote. Existing emoji-only votes migrate to 5/5. Configured options with votes cannot be removed. Daily views use a hashed HttpOnly browser identity, with service-authenticated BFF requests; no view IPs are stored.

Reputation is the `Reputation` enum: `UNKNOWN` without entries, `GOOD` when approved trust entries outnumber doubts, `BAD` for the opposite, `AVERAGE` for a tie. Only a translated colored label is displayed. No amounts or banking information exist. The old `creditScore` remains deprecated for compatibility.

Private S3 media use server-created keys under `person-media/`. PNG/JPEG avatars are limited to 2 MiB, photos to 32 MiB, MP4/WebM videos to 512 MiB. Image dimensions/signatures are checked. Reopenable upload streams support SDK checksum/retry reads. Pending files are visible only to their uploader and admins. Scheduled cleanup retries removal of deleted/rejected objects and abandoned uploads older than one day.

Multipart uploads skip Next.js proxy body cloning. The BFF checks authentication and Origin before streaming to a fixed backend route. The combined request cap is 545 MiB including the preview, with a ten-minute transfer timeout. Spring spools multipart parts to temporary files; Nginx request buffering is disabled. The desktop media viewer places comments and sorting on the right, with large navigation arrows outside the panel. Navigation changes the content and media URL while keeping the dialog open.

Media stream through the BFF, including single closed/open/suffix byte ranges. The custom player handles playback, seeking, audio, speed, fullscreen, keyboard controls and errors. Branded public assets stay under `assets/`; persona photos remain private.

The header is fixed, transparent at the top and filled with the active theme color after scrolling. Empty states and notification items have no fill. Photos and videos use a card grid with captions underneath. Video thumbnails show `mm:ss` duration in the lower right corner. The browser measures duration and prepares a JPEG preview; the server validates bounds and the image before storing both in S3. Legacy videos use their first frame and browser metadata.

The shared viewer places media on top, followed by the title, publisher, combined reaction control, tagged personas and comments. Likes and dislikes are mutually exclusive and idempotent. Media comments are separate from wall comments and require moderation. Linked authors have clickable persona avatars/names. Edits to comments, reputation entries, captions and tags also require approval. Up to 20 published personas can be tagged per item. V2 migrates existing moment comments and likes.

## Ownership verification

Unlinked pages show “This is my page”; anonymous visitors go through ID and return to the page. A claim includes a 10–2000 character explanation and a PNG/JPEG image up to 12 MiB. `CLAIM_OWNERSHIP` enters the moderation queue. Evidence remains private to its author and administrators, including after approval; it never enters the public gallery. Rejected evidence is cleaned up in the background.

An approved owner can edit the persona and receives a verified badge with a tooltip. Each account owns at most one page, enforced by the database as well as the service. Administrators can link/unlink accounts directly through the moderated owner operation. Deleting a persona releases the account link. Decisions appear in notifications.

## Administration and achievements

The admin sidebar links users (`http://localhost:3001/ru`), personas, moderation and achievements. `/ru/persons/{tag}` manages profile fields, avatar, wall, reputation, photos, videos and awards. Persona content changes require moderation; achievement definitions are managed directly by administrators.

`AchievementService` belongs to person. Definitions live in `achievements`, awards in `person_achievements`. Definitions include an S3 image, title, description, active flag and version. Administrators can edit metadata/images, archive/restore definitions, award up to 100 personas per request, and revoke individual awards from persona management. Repeated grants preserve existing awards. Archived definitions disappear from public profiles. `storage_garbage` tracks obsolete or abandoned achievement images for retryable cleanup after one day.

To seed a running local Compose stack, put FFmpeg in PATH or configure `FFMPEG_BINARY`, then run `node scripts/create-demo-video.mjs` and `node scripts/seed-demo.mjs`. One ADMIN account, `demo@persons.local`, is created with a random password stored only in ignored `.build/person-demo-account.json`. Existing accounts are not replaced and no emails are sent. Repeated runs preserve published demo content. Reference photos come from `Desktop/люди` or `DEMO_FRIENDS_DIR`. The temporary seeding session is revoked.

`/krel` is complete and linked to the account; `/vadim` and `/tyamik` are partial with good/bad reputation; `/slava` and `/artem` show empty states. Demo social links point to public platform pages, not verified personal accounts. The video is an eight-second illustration, not actual footage. Moderation and notifications include pending/approved/rejected examples.

Backend checks: `ktlintCheck :app:api:test :app:api:bootJar`. Frontends: `npm ci`, `npm run check`, `npm run build:prod`. In person run `npx playwright test tests/e2e/person-domain.spec.ts` against Compose and seeded data. It uses password sign-in and sends no mail.

Run `node scripts/seed-person-features.mjs` after the base seed to add media tags and achievements for Krel/Vadim. It creates no additional accounts, sends no email, revokes its own session and keeps `/artem` empty. Run both `person-domain.spec.ts` and `person-evolution.spec.ts` for the complete browser coverage, and add `:app:contract:client:build` to backend checks. `gallery.yaml`, `claims.yaml` and `achievements.yaml` define the new generated TypeScript/Kotlin APIs.

`person-upload.spec.ts` additionally uploads the real `.build/demo-moment.mp4` through the UI, checks its generated JPEG preview, duration, moderated tags and publication, then removes its own test moment through moderation.

See [community interactions](community_en.md) for author-visible pending text, rating comments, reaction author lists, media views, loans and personal page requests.
