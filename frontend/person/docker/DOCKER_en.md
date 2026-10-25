# person: Docker and Podman

Run every command from the repository root. Use Docker with a Linux Engine and Compose v2, or Podman with a configured machine on Windows/macOS and a Compose provider supporting `include`. Images pin Node.js 24.11.1 and Gradle 8.14.3/JDK 21. Generated clients and npm packages are built inside the image; container builds do not require host Node/JDK installations.

Prepare the root `.env` with `./scripts/setup.ps1` (on Linux, copy `.env.example` and replace the sample secrets). Configure PUBLIC_ID_URL, PUBLIC_PERSON_URL, PUBLIC_ADMIN_URL and SMTP. Secrets are runtime parameters. Person listens on container port 3000 and is exposed by the gateway on 3002; ID uses 3000 and admin 3001. All local public URLs must share a hostname for the HttpOnly session cookie.

First build shared services with `docker compose build` or `podman compose build`. Then choose one UI profile. Do not run variants on the same ports simultaneously. These profiles use the shared local backend stack; separate environments need separate data and URLs.

`dev` runs Next dev with Fast Refresh, a source bind mount and separate Linux node_modules/.next volumes. `testing` and `prod` use the standalone production server as node. Configuration is read server-side at runtime, pages are dynamic and there is no NEXT_PUBLIC configuration; the same runtime artifact is checked with APP_ENV=testing/prod.

## dev

```powershell
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.dev.yaml config --quiet
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.dev.yaml build person-web
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.dev.yaml up -d --wait person-web gateway
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.dev.yaml ps
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.dev.yaml logs -f person-web gateway
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.dev.yaml down
```
```powershell
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.dev.yaml config --quiet
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.dev.yaml build person-web
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.dev.yaml up -d --wait person-web gateway
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.dev.yaml ps
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.dev.yaml logs -f person-web gateway
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.dev.yaml down
```

## testing

```powershell
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.testing.yaml config --quiet
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.testing.yaml build person-web
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.testing.yaml up -d --wait person-web gateway
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.testing.yaml ps
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.testing.yaml logs -f person-web gateway
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.testing.yaml down
```
```powershell
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.testing.yaml config --quiet
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.testing.yaml build person-web
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.testing.yaml up -d --wait person-web gateway
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.testing.yaml ps
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.testing.yaml logs -f person-web gateway
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.testing.yaml down
```

## prod

```powershell
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.prod.yaml config --quiet
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.prod.yaml build person-web
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.prod.yaml up -d --wait person-web gateway
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.prod.yaml ps
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.prod.yaml logs -f person-web gateway
docker compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.prod.yaml down
```
```powershell
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.prod.yaml config --quiet
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.prod.yaml build person-web
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.prod.yaml up -d --wait person-web gateway
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.prod.yaml ps
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.prod.yaml logs -f person-web gateway
podman compose --env-file .env -f docker-compose.yaml -f frontend/person/docker/compose.prod.yaml down
```

## Standalone container

Copy `frontend/person/docker/.env.example` to the adjacent `.env.local`, set the shared internal JWT secret and URLs. These examples use the existing local stack network. ID's PUBLIC_PERSON_URL must match the selected public person address for authentication return navigation.

```powershell
docker build --target runtime -f frontend/person/docker/Dockerfile -t persons-person-web:manual .
docker run --rm --network persons_default --env-file frontend/person/docker/.env.local -p 127.0.0.1:3302:3000 persons-person-web:manual
podman build --target runtime -f frontend/person/docker/Dockerfile -t persons-person-web:manual .
podman run --rm --network persons_default --env-file frontend/person/docker/.env.local -p 127.0.0.1:3302:3000 persons-person-web:manual
```

For host development install Node 24.11.1/npm 11, generate the existing ID/i18n SDKs through Gradle, run npm ci in frontend/person and prepare .env.local from its example. Commands: npm run dev, npm run build:testing / npm run start:testing, npm run build:prod / npm run start:prod; npm run check validates code. Native dev uses 3002, so free that port or choose another port and align public URLs. Shared file dependencies are packaged; repeat npm ci after changing frontend/libs.

For startup errors check /api/health, backend/S3 URLs, port conflicts, SDK generation and font/media files. HTML emails come from backend/id and are delivered by backend/mail using root .env SMTP settings. Run fixture-address registration tests only with Mailpit.

Normal down preserves data. down -v removes PostgreSQL/S3 and dev dependency volumes and is a separate destructive operation. Docker/runtime profiles are verified in this task; Podman was not executed and needs a compatible Compose provider.
