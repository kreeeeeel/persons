# Legal pages, directory and runtime variables

Person adds `/{locale}/privacy`, `/{locale}/terms`, `/{locale}/people` and `/{locale}/feed` for Russian and English. They use the main site's header. The privacy link has hover and focus backgrounds. On small screens, Gravity Disclosure collapses the document contents menu. The landing page links to the directory beneath the search field; the header links to the feed.

The directory uses real published pages and database statistics, with server sorting and pagination. Fixtures in `tests/fixtures` are limited to local review tools and tests. See [Real directory and feed data](../community-data/en.md).

ID email registration now requires a checkbox that is unchecked initially, with only the terms link next to it. Legal links retain the locale and redirect to the configured `PERSON_PUBLIC_URL`. This is a UI prototype: server-side acceptance/version records and first-time OAuth acceptance are not implemented yet.

Both documents are review drafts and excluded from indexing. Final publication requires actual operator details, contact email, retention and deletion schedules, providers, processing locations and applicable legal grounds. Agreement acceptance is kept separate from personal-data or public-disclosure consent. The drafts cover third-party pages, images, reviews, loan records, AI content, requests without an account and moderation appeals. Legal pages remain accessible to blocked users.

## Variables

Typed declarations, contract, Redis and memory updates now belong to backend/libs/dynamic-properties. The separate frontend library uses a configured URL, startup cache and SSE. SQL storage and value polling have been removed. Legacy settings endpoints remain compatible.

[Lifecycle, configuration and rules](../game-integrations/en.md).

## Local preview

After installing local packages and generating clients, run from the repository root:

```powershell
./scripts/start-community-preview.ps1
```

For a lighter preview without development compilers, run `npm run build:testing` in `frontend/id`, `frontend/person-admin` and `frontend/person`, then:

```powershell
./scripts/start-community-preview.ps1 -Built
./scripts/stop-community-preview.ps1
```

Ports 3000, 3001, 3002 and 4310 must be free. All listeners bind to loopback. The preview tool (`frontend/person/tools/preview-api.ts`) never contacts real services, sends mail or creates production accounts. Its values are disposable and reset on restart. `example.test` contacts and its session are demonstrations. Logs and timestamped process IDs live in `%TEMP%/persons-community-preview`, outside Next.js watched files.

- Home: http://localhost:3002/ru
- Directory: http://localhost:3002/ru/people
- Legal: http://localhost:3002/ru/privacy and http://localhost:3002/ru/terms
- ID: http://localhost:3000/ru
- Mock admin sign-in: http://localhost:4310/session

Replace `ru` with `en` for English; use `/session?locale=en` for the English admin preview.

Run `npm run check` in all three applications and `:app:api:test`, `:app:api:ktlintCheck` in backend/person. Browser checks explicitly opt into the mock preview:

```powershell
cd frontend/person
$env:E2E_MOCK_PREVIEW = 'true'
npm run test:e2e -- tests/e2e/legal-directory.spec.ts --timeout=120000
```

## Revised interface, cookies and deleted media retention

The directory now has a single column of content: sorting below the introduction, borderless cards without interests, and automatic paging through the shared InfiniteFeedLoader/BrandLoader. Search stays in the header. Draft and preview notices have been removed from the UI. Language selection lives inside the legal documents. Registration shows only the required terms checkbox. The operator confirms that data storage is in Russia.

The bottom cookie notice uses the existing consented Vadim illustration as the reference for a new cookie scene. Optional view tracking is disabled until agreement and after refusal. Choices persist for one year; refusal clears the visitor cookie and keeps the site usable. Preferences can be reopened from the privacy policy. The same-origin endpoint validates the choice, and save failures remain visible.

MAP/JSON values are hidden in the table and available in a read-only dialog. CodeMirror 6 provides JSON highlighting, line numbers, folding, search, history and syntax diagnostics. Formatting is available and invalid JSON cannot be saved. Editor colors follow Gravity theme tokens.

Flyway V20 adds deletion timestamps to media and pages. The existing cleanup worker retains deleted media and retired objects for five calendar years after deletion, then removes originals, previews and quality variants. Active media is unaffected by upload age; unattached staged uploads still expire after one day. Unknown historical deletion dates start at migration time. Retry and locking behavior is preserved. No real S3 lifecycle rule or production data was changed.

This is an upper limit for private deleted media, subject to a lawful basis and earlier mandatory erasure. It does not implement a blanket retention period for all account data or automate individual erasure requests. ID records, logs and backups require their own retention implementation. S3 lifecycle expiry normally uses object creation time ([AWS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-expire-general-considerations.html)); the worker uses the actual deletion timestamp instead. The policy also preserves earlier erasure required under [Article 21 of 152-FZ](https://www.consultant.ru/document/cons_doc_LAW_61801/d3fe43a7c415353b17faab255bc0de92bea127da/).

Variable rows reuse ListTable for rounded corners, edge spacing and load states. ActionTable supports either a row action menu or opening an editor directly; variables use direct editing without an actions column. Nested JSON view controls remain independent. Entire directory cards now link to localized profiles, with a hover scale/color effect that respects reduced motion. The mock API serves matching profiles and empty feeds. Cookie notice spacing is more compact; button height and line-height use the same Gravity token.

The cookie notice mounts with the localized content and enables its buttons after hydration. It is excluded from loading fallbacks so an early click is not lost when the loading screen is replaced. The legal navigation scrollbar is revealed on hover or keyboard focus within the menu.
## Community feed

The feed uses a server aggregate over existing publications and matches. See [real data documentation](../community-data/en.md) for pagination, filters, visibility and validation. Legacy scenario query parameters have been removed from the application.
