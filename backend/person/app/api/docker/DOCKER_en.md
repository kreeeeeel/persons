# Person API

From the repository root run `docker compose build person` and `docker compose up -d person`. Port: `8085`; health: `/actuator/health`; contract: `/openapi/api.yaml`; logs: `docker compose logs -f person`.

Required environment: PostgreSQL `DB_URL`, `DB_USER`, `DB_PASSWORD`; `ID_BASE_URL`; shared `PROJECT_INTERNAL_JWT_SECRET`; S3 `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`. Compose forwards these at runtime. Private media are exposed through publication-checked API endpoints with Range support.

Spring profiles: `dev`, `testing`, `production`; `tests` uses H2 and mocked integrations. Source builds generate contracts/clients and run ktlint and tests. The shared `docker/compose.prebuilt.yaml` supports an existing JAR.

On an existing PostgreSQL volume create the missing `person` database once: `docker compose exec -T postgres psql -U persons -d postgres -c "CREATE DATABASE person"`. Fresh volumes initialize it automatically. Keep existing volumes.

See [shared Docker](../../../../../docker/DOCKER_en.md) and [domain/demo guide](../../../../../docs/person/domain_en.md).
