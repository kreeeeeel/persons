# Docker / Podman

Run from the repository root. Docker Compose v2 is required. Podman needs an installed Compose provider for `podman compose`.

```powershell
./scripts/setup.ps1
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose logs -f id mail
docker compose down
```

Equivalent Podman commands: `podman compose config`, `podman compose up --build -d`, `podman compose logs -f id mail`, `podman compose down`. Podman is a supported configuration path; verification results must explicitly say whether it was exercised.

`down` preserves named volumes. **`docker compose down -v` / `podman compose down -v` permanently deletes local PostgreSQL and S3 data.**

Frontend ports: 3000 (ID), 3001 (admin), 3002 (person). `web-gateway` forwards these ports to internal Next.js services and replaces forwarded client IP headers. Backend health endpoints: 8081 (ID), 8082 (i18n), 8083 (mail), 8085 (Person), 8087 (Kotlin gateway), 8088 (Restrictions), each under `/actuator/health`. PostgreSQL is exposed locally on 54320, Redis on 6379 for local development only, SMTP on 1025, Mailpit on 8025, S3 on 9000 and its console on 9001. Ports bind to loopback. Production Redis has no published port. See [restriction migration and new secrets](../docs/deployment/restrictions_en.md).

Flyway migrations run at service startup; JPA uses `ddl-auto=validate`. MinIO initialization publishes only `persons/assets/*` and uploads the versioned friend illustration and SVG brand files. Never publish the avatar prefix.

`.env` contains local credentials and is not copied into images. Backend JVMs run as UID 10001; frontend Node processes run as `node`. Next standalone output includes public files and `.next/static`. Backend Dockerfiles live under `backend/<service>/app/api/docker`; frontend Dockerfiles live under `frontend/<app>/docker`.

For runtime verification using existing local builds:

```powershell
docker compose -f docker-compose.yaml -f docker/compose.prebuilt.yaml up --build -d
```

The prebuilt path requires all four `bootJar` artifacts and all three Next.js standalone builds. The ordinary source build does not require local outputs. If changing shared frontend libraries after installation, repeat `npm ci` because local file dependencies are packaged with `install-links=true`.

Use HTTPS and your own public URLs when leaving local development. Replace local SMTP/S3 endpoints and credentials with your provider configuration. The current Compose is intended for a local instance.
