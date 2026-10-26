# Те ещё люди · Persons

**Our people. Our stories.** A small social platform for a circle of friends: persona pages, shared memories, photos and video, reviews, achievements, moderation and Dota 2 history.

[Live website](https://kreeeeeel.ru) · [Wiki](docs/wiki/Home.md) · [Screenshots](docs/wiki/Screenshots.md) · [Русский](README.md)

![Live homepage](docs/screenshots/home.png)

Development resumed on **26 October 2026** with [profile dates, military service countdowns, a unified gallery and improved mobile layouts](docs/person/military-service_en.md). The full source snapshot is available here; component history and production CI remain on [GitLab](https://gitlab.com/te-eshche-lyudi). The October 25 archive release is preserved.

## Features

- Searchable directory and persona pages with tags and social links.
- Wall posts, ratings/reviews, comments, reactions and feed.
- Photos, video moments, previews and person tagging.
- Achievements, reputation, loans and page ownership requests.
- Email signup, recovery, Yandex ID and session management.
- Separate CMS for accounts, content, moderation and dynamic settings.
- Configurable OpenDota and Leetify imports, Dota 2 / CS2 history and match details.
- Russian/English, light/dark themes, responsive UI and reduced motion.

The feed and administration require authentication. External integration availability depends on configuration and the provider; UI placeholders do not imply implemented providers.

## Stack and layout

Kotlin, Spring Boot, Spring Data JPA, Flyway and generated OpenAPI clients; TypeScript, Next.js App Router, React, Gravity UI and CSS Modules. PostgreSQL stores separate service databases; S3 stores objects; Redis supports restrictions and durable dynamic properties.

`backend/` contains APIs, workers and shared libraries. `frontend/` contains Person, ID, CMS, shared libraries and branded assets. `docker/`, `ci/`, `scripts/` and `docs/` preserve setup, operations and tests.

## Run a copy

```sh
git clone https://github.com/kreeeeeel/persons.git
cd persons
```

All components are ordinary files in this checkout; private GitLab access is not needed. Run `./scripts/setup.ps1` in PowerShell, or prepare `.env` from `.env.example` on Linux, then use `docker compose up --build -d`. See [Getting Started](docs/wiki/Getting-Started.md) and the [original English development guide](DEVELOPMENT_en.md) for prerequisites, ports, generated clients and checks.

## Archive and provenance

[SOURCE_REVISIONS.json](SOURCE_REVISIONS.json) pins all 19 source repositories. Application logic is unchanged; documentation and live screenshots were added for preservation. Database dumps, S3 private data, credentials and original reference photos are kept outside this repository.

The source project has no single open-source license. Publication does not grant an additional license; third-party dependencies, fonts and game/brand imagery retain their respective rights. See [rights and provenance](docs/archive/RIGHTS.md).
