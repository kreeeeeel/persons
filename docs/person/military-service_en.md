# Profile dates and unified gallery

Birth, military departure and expected/actual return dates are edited through the shared profile editor, including the CMS. Existing authorization, optimistic versions and moderation apply. Existing profiles keep absent dates without invented values.

Desktop profiles have a sticky identity column with avatar, name, views, colored rating, date cards and countdown; description, tabs and content appear on the right. Mobile profiles use a sequential layout and expandable long descriptions. Navigation and account controls move into a side menu. Landing artwork appears above search.

## Dates

`PersonProfile.dates` contains calendar `birthDate`, `militaryDepartureDate` and `militaryReturnDate`. Age, service state and countdown use the `Europe/Moscow` calendar day. The return notice appears on the return date and the following six days, then disappears; the departure date stays visible. Unknown return dates do not imply a guessed service duration.

Omitting `ProfileInput.dates` preserves stored dates; `{}` clears them. Future birthdays, departure before birth and return without/at/before departure are rejected. Flyway `V27` adds nullable DATE columns, ordering constraints and a gallery index without inserting content.

## Media

`GET /v1/persons/{id}/gallery?page=0&size=12` returns a single page of photos and moments from `person_media`, ordered by `createdAt DESC, id DESC`. Existing publication and moderation visibility applies. Other uploaders' pending files, deleted media, avatars and proof files are excluded.

The public profile and CMS share `Gallery` with automatic loading on downward scroll. Upload appears above the grid on the left and opens the common file picker directly. Mixed selections use the original photo/video preview for each file, preserving captions, people tags and the upload queue. Views appear at the upper right of previews; video duration stays at the lower right.

The original viewer retains playback, comments, reactions, author information, editing and `?photo=`/`?video=` links. `GET /v1/media/{id}/details?mixed=true` supplies cross-kind neighbors and their kinds across page boundaries. Legacy callers retain same-kind navigation without this parameter. The BFF forwards it using the generated client.

## Verification

Run `./gradlew ktlintCheck :app:api:test :app:api:bootJar :app:contract:client:typescript:compileClient` in backend/person, plus the gateway and person-worker checks. Run `npm run check` and `npm run build:prod` in both frontend apps.

`tests/e2e/profile-release.spec.ts` covers real local APIs, both languages/themes, mobile/desktop layout, service states, uploads, original viewers, comments, navigation, pagination and CMS date editing. Seed only the isolated local `persons-feature` Docker project with `node scripts/seed-profile-review.mjs --local-review` after generating clients and `node frontend/person/tools/create-feed-preview-media.ts`. Temporary credentials and fixture IDs stay in ignored `.cache/`. With dev servers on 3002 and 3001, run `E2E_REAL_PROFILE=true npx playwright test profile-release.spec.ts` in frontend/person. Runtime profiles use real API data; the military mock preview has been removed.
