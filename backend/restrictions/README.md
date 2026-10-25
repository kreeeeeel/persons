# Restrictions

Canonical account restrictions service, Kotlin/Spring MVC on port 8088. Own PostgreSQL database `restrictions`, optional Redis cache, internal JWT authentication and administrator sessions resolved through ID. Redis outages fall back to the database; database outages fail closed.

The source contract is `app/contract/api/schema/api.yaml`; Gradle generates server interfaces, Kotlin and TypeScript clients. Run `./gradlew build ktlintCheck`. Integration tests use H2 by default; `RESTRICTIONS_POSTGRES_TEST_URL`, `RESTRICTIONS_REDIS_TEST_HOST` enable PostgreSQL/Redis tests with the CI fixture credentials. Redis defaults to port `6379` and password `tests-cache-password`; use `RESTRICTIONS_REDIS_TEST_PORT` and `RESTRICTIONS_REDIS_TEST_PASSWORD` for another disposable test instance. See [Russian documentation](docs/restrictions/ru.md), [English documentation](docs/restrictions/en.md) and [Docker](app/api/docker/DOCKER_en.md).
