# Person API

Из корня репозитория: `docker compose build person`, затем `docker compose up -d person`. API работает на `8085`, проверка — `/actuator/health`, контракт — `/openapi/api.yaml`. Логи: `docker compose logs -f person`.

Нужны PostgreSQL (`DB_URL`, `DB_USER`, `DB_PASSWORD`), ID (`ID_BASE_URL`), общий `PROJECT_INTERNAL_JWT_SECRET` и S3 (`S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`). Compose передаёт их из окружения; секреты не входят в образы. Медиа приватные, выдаются через API с проверкой публикации и поддержкой Range.

Spring-профили: `dev`, `testing`, `production`; `tests` использует H2 и подменённые внешние сервисы. Сборка из исходников генерирует серверные интерфейсы и клиенты, выполняет ktlint и тесты. Уже собранный JAR можно запустить через общий `docker/compose.prebuilt.yaml`.

Для существующего PostgreSQL-тома перед первым запуском добавьте базу командой `docker compose exec -T postgres psql -U persons -d postgres -c "CREATE DATABASE person"`, если её ещё нет. На новом томе база создаётся автоматически. Удалять том не нужно.

Подробнее: [общий Docker](../../../../../docker/DOCKER_ru.md), [модель персон и демо](../../../../../docs/person/domain_ru.md).
