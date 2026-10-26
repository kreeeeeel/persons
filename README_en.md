> Development ended on 25 October 2026. [Public GitHub archive](https://github.com/kreeeeeel/persons) · [Wiki](docs/wiki/Home.md) · [Screenshots](docs/wiki/Screenshots.md). The live site is left running.

# Те ещё люди

The private [Те ещё люди group](https://gitlab.com/te-eshche-lyudi) contains separate service, application and library repositories. Clone the integration workspace with `git clone --recurse-submodules https://gitlab.com/te-eshche-lyudi/infrastructure.git persons`. For an existing checkout run `git submodule update --init --recursive`. Commit and push changes inside a component first, then update its gitlink in infrastructure. Pinned submodules retain reproducible local builds; `git submodule update --remote --merge` explicitly updates to current main branches.

[GitLab CI/CD, VDS preparation and the `op email` command](docs/deployment/en.md). Runtime secrets remain on the server; CI uses protected SSH deployment settings.

A local friendship project with ID, persona pages, ratings and reviews, wall comments, photo and video galleries, loans, achievements and moderation. The public site and CMS share backend/person. See [the latest behavior and checks](docs/person/community_en.md).

Run `./scripts/setup.ps1`, set `PERSONS_ADMIN_EMAIL` in the generated `.env`, then `docker compose up --build -d` from the repository root. On Linux, copy `.env.example` to `.env` and replace every sample secret with a random value. Docker builds generate OpenAPI clients before installing the frontend packages.

- Identity: http://localhost:3000/en
- Main person application: http://localhost:3002/en
- Administration: http://localhost:3001/en
- Local email inbox: http://localhost:8025
- MinIO console: http://localhost:9001

ID, person and admin share a host-only cookie locally. Production uses a Secure cookie on the configured common domain covering the main site, `id.` and `cms.`. Local `web-gateway` publishes the three frontends and replaces forwarded IP headers; production uses host Nginx with loopback Next.js ports. BFFs reach ID and Person through the Kotlin `gateway`.

Register and verify the configured administrator email using Mailpit. The first matching verified account becomes `ADMIN` within five seconds if no active administrator exists. Remove the bootstrap email after initial setup. No default account or password is installed.

Admin features include paginated search, USER/ADMIN roles, restrictions and session revocation. Role changes revoke existing sessions. Administrators cannot fully block or demote themselves through CMS. ID owns roles; `backend/restrictions` owns bans, and the gateway enforces them before Person. Existing account administration contracts remain compatible through the gateway. Content administration stays in Person. Identity sessions remain available to explain bans and allow sign-out. See [architecture and migration](docs/deployment/restrictions_en.md).

Register a web application with [Yandex OAuth](https://oauth.yandex.ru/), request `login:info login:email`, and register the exact callback `http://localhost:3000/api/oauth/yandex/callback`. Set `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET` and `YANDEX_REDIRECT_URI`; recreate `id`, `id-web`, `person-admin-web` and `person-web`. Custom deployments must also set `PUBLIC_ID_URL`, `PUBLIC_ADMIN_URL` and `PUBLIC_PERSON_URL`. The flow uses authorization code, PKCE S256, expiring single-use state and an HttpOnly browser binding. Existing email accounts are never automatically linked. Live Yandex sign-in requires your application credentials.

`frontend/id`, `frontend/person` and `frontend/person-admin` are separate Next.js/Gravity UI applications. The person application provides a full-screen illustrated landing page and account menu; search queries the person API after a debounce. Shared assets, Golos Text, themes, photo editing and localization live under `frontend/assets` and `frontend/libs`. Spring Boot services live under `backend/id`, `backend/person`, `backend/mail` and `backend/i18n`, using `com.persons` packages and contract-first generated Kotlin/TypeScript clients.

Brand illustrations and avatars are served from S3. Only `persons/assets/*` is public. Avatars remain private and are delivered through authenticated APIs. Avatar bytes are durably staged in the database until the background S3 transfer succeeds, then removed from staging. Favicons and fonts ship with the apps. Reference photos are not committed.

External storage uses `docker/compose.external-s3.yaml` and the `external` storage profile. Object categories are `achievments/`, `video/`, `photo/`, `avatars/`, private `proofs/` and public `assets/`. Worker retries physical deletion of removed media and retired achievement images through a database queue; ID cleans up its replaced avatars. Databases `id`, `person`, `restrictions`, `mail` and `i18n` are separate databases in one PostgreSQL cluster. Restrictions uses a revision-based Redis cache with database fallback. Gateway has no database.

Mail uses Mailpit when SMTP settings are omitted. For a real SMTP provider set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_AUTH`, `SMTP_STARTTLS`, `SMTP_STARTTLS_REQUIRED` and `MAIL_FROM` in the ignored root `.env`, then recreate mail with `docker compose up -d --no-deps mail`. These variables are explicitly forwarded to the container and stay outside images. Verification uses localized purple HTML emails. Persistent outboxes retry temporary failures.

For local development install JDK 21, Node 24.11.1 and npm 11. Run `generateClients` through each of `backend/id`, `backend/i18n` and `backend/person` Gradle wrappers before `npm ci` in the frontend applications. Each app provides `npm run check`, `npm run build:prod` and `npm run dev` (ID 3000, admin 3001, person 3002). Frontend profiles are `APP_ENV=dev|testing|prod`; Spring uses `dev|testing|production|tests`. Run `./scripts/check-backend.ps1` on Windows or `./gradlew build` in each backend and library directory on Linux.

See [Russian setup details](README.md), [Docker/Podman](docker/DOCKER_en.md), [authentication](docs/auth/en.md), and [assets](docs/assets/en.md).

Administration at `http://localhost:3001/ru` has a sidebar for users, personas, moderation and achievements. Profiles include ratings out of five with a chosen emoji, a shared photo/video viewer with tagged people, reactions and comments, and private ownership verification claims. Run `node scripts/seed-person-features.mjs` after the base seed for media tags and demo awards.

Public ratings are paginated at `GET /v1/persons/{id}/ratings`. `RatingState.availableEmojis` supplies a 96-emoji palette; votes accept `emoji` or a configured `optionId`. Each account has one replaceable vote. Migration V3 preserves existing scores and emoji.

Achievement cards show an image and title, with description and award date in a details dialog. Metadata and grants are stored in PostgreSQL; transparent PNG images are stored in S3. Twelve generated badges and their built-in image_gen prompts are in `frontend/assets/achievements`. The feature seed creates all twelve definitions and awards developer and pleasant-person badges to demo personas; the remaining definitions are available in administration.

[Person domain, moderation and local demo](docs/person/domain_en.md). Complete profile: `/krel`; partial: `/vadim`, `/tyamik`; empty: `/slava`, `/artem`. Seed explicitly with `node scripts/seed-demo.mjs`; credentials stay in ignored `.build/person-demo-account.json` and no mail is sent. [Illustrations and prompts](docs/assets/person-states.md).
# Account restrictions and content likes

The admin Users section has a Restrictions action. Administrators can restrict comments, ratings, loans, uploads, profile changes, reactions, or the whole project, with a reason and an optional expiry date. Expired or revoked restrictions no longer apply. A fully restricted account is redirected to the localized `/blocked` page; administrators cannot fully block themselves. ID retains the identity session so the project can explain the restriction and offer sign-out. Person API access remains denied except for the account's own access state.

Migration V5 stores restrictions and idempotent likes for comments, ratings and loan entries in PostgreSQL. Pending photos and videos are visible to their uploader with an Under review label. The backend denies reactions and comments and does not count views until approval. Shared UI components are used by both the public frontend and CMS. Artwork is stored in S3; generation records are in `docs/assets/final-polish-generation.json`.

Set `ADMIN_PUBLIC_URL` on frontend/person to configure the admin menu destination.

`backend/person-worker` is started by Docker Compose. It recalculates rating snapshots and reputation every two seconds, calls the restriction owner's expiry API every 30 seconds, and retries S3 garbage cleanup every minute. Reputation combines ratings (60%) with approved loan reports (40%); if only one source exists, it receives full weight. Below 40 is BAD, 40–70 is AVERAGE, and 70+ is GOOD; no reports means UNKNOWN. Restrictions checks expiry timestamps immediately, even before cleanup. Public feeds and modal lists use infinite scrolling with the shared rotating-logo loader, cancellation and retry. [Queue design, formula, configuration and checks (Russian)](docs/person/background-jobs.md).

Comments, reviews and loans support exclusive likes/dislikes and server-side ordering by newest, oldest, most liked or most disliked. Shared controls are used by the site and CMS. [API, migration and sorting rules](docs/person/content-reactions_en.md).

The main site, ID and CMS share Yandex Metrica counter `113741427`, enabled only in production after optional-cookie consent. [Configuration, scope and verification](docs/analytics/en.md).

Production persistence uses Spring Data JPA and Criteria API. Shared API/worker entities live in `backend/person/app/maintenance`; `node scripts/check-persistence.mjs` rejects JDBC templates and native SQL. [Leetify setup, API and limitations](docs/game-integrations/en.md#leetify--counter-strike-2).
