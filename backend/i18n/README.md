# Persons · i18n

Базовый Kotlin-пакет: `com.persons.i18n`. Серверный контракт и JVM-клиент генерируются в подпакетах этого пространства.

Сервис переводов: ключи и локализованные значения в PostgreSQL, Flyway управляет только схемой.

## Структура

- `app/api` — приложение, конфигурация профилей, JPA, Flyway и тесты.
- `app/contract/api` — OpenAPI и generated серверные интерфейсы.
- `app/contract/client` — Kotlin-обёртка generated-клиента.
- `app/contract/client/openapi` — generated Kotlin WebClient.
- `app/contract/client/typescript` — generated TypeScript Fetch SDK.

Каждый сервис имеет собственный Gradle Wrapper. Локальные библиотеки подключаются через Gradle composite builds. Нужны JDK 21, Node 24.11.1 и npm 11; запускать из `backend/i18n`:

```sh
./gradlew build
./gradlew generateClients
./gradlew :app:api:bootRun --args='--spring.profiles.active=dev'
```

Windows: `gradlew.bat` вместо `./gradlew`. При проблеме Java Unix-domain sockets на Windows используйте `frontend/id/tools/gradle.ts`: helper выбирает отдельный кэш текущего пользователя. Выход сборки — игнорируемый `.build` каждого модуля. Его создаёт Gradle, исходниками он не является.

## Поведение

База после Flyway пуста. В проекте нет JSON-каталогов, загрузчика seed-файлов и переводов в SQL-миграциях. **Переводы и ключи никогда не добавляются в миграции.**

`GET /v1/catalogs/{locale}/{namespace}` возвращает `messages`, стабильную версию содержимого и ETag. Не заполненный каталог возвращает пустой объект. Поддерживаются BCP-47 коды, например `ru`, `en`, `pt-BR`.

`PUT /internal/v1/catalogs/{locale}/{namespace}` с телом `{"messages":{"key":"value"}}` создаёт или обновляет только переданные ключи; остальные сохраняются. Нужен `X-Service-Authorization: Bearer <JWT>` с audience `persons-internal`, scope `service`. При конкурентном конфликте возвращается 409, запрос можно повторить. Один запрос ограничен 1000 ключами, значение — 10000 символами. ICU-сообщения используются во frontend через next-intl. Редактирование и проверка смысла переводов остаются за владельцем каталога.

Фронтенд содержит собственные начальные подписи формы и переопределяет их данными сервиса. Они не наполняют эту БД. Письма требуют явно добавленных переводов.

Swagger UI в профиле dev: [localhost:18082/swagger-ui/index.html](http://localhost:18082/swagger-ui/index.html). Интерфейс использует контракт из `/openapi/api.yaml`; генерация альтернативного определения через `/v3/api-docs` отключена. В testing и production Swagger UI отключён.

## Настройки

Порт `8082`, health `/actuator/health`. Профили `dev`, `tests`, `testing`, `production`. H2 используется только в тестах; dev/testing/production — PostgreSQL. `DB_URL`, `DB_USER`, `DB_PASSWORD`, `PROJECT_INTERNAL_JWT_SECRET` обязательны вне dev. Для id дополнительно `ID_JWT_SECRET`, `ID_PEPPER`, `MAIL_BASE_URL`, `I18N_BASE_URL`. Для mail: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`.

Общий request logger подключён к каждому сервису. `X-Request-ID` передаётся по цепочке. `PROJECT_LOG_BODIES=true` включает тела JSON с ограничением 65536 байт; `project.observability.masked-fields` и `masked-headers` принимают маски `*`. Пароли, OTP, grants, токены, cookie, HTML писем и данные аватаров скрываются всегда. Большие тела помечаются как обрезанные; файлы не пишутся в журнал. Для поиска по request id нужен сбор stdout в выбранную систему логов; внешнее хранилище логов пока не подключено.

## CI и контейнеры

[.gitlab-ci.yml](.gitlab-ci.yml): MR — сборка, ktlint, OpenAPI и тесты; default branch — образ, публикация Kotlin/TypeScript SDK и SSH deploy. Общая настройка GitLab и секретов: [nginx README](../nginx/README.md). Деплой начнёт работать после предоставления credentials и подготовки сервера. Реальный production сейчас не развёрнут.

Инструкции: [Docker / Podman RU](app/api/docker/DOCKER_ru.md), [EN](app/api/docker/DOCKER_en.md).

## English

In dev, Swagger UI is available at [localhost:18082/swagger-ui/index.html](http://localhost:18082/swagger-ui/index.html) and loads the schema from `/openapi/api.yaml`. The generated `/v3/api-docs` definition is disabled. Swagger UI is disabled in testing and production.


Translation keys and values in PostgreSQL; Flyway manages schema only. Run `./gradlew build` from `backend/i18n` with JDK 21 and Node 24.11.1. The independent wrapper builds the application, validates OpenAPI, generates Kotlin/TypeScript clients and runs tests. Local composite builds resolve sibling libraries. Generated output lives in ignored `.build` directories.

Use PostgreSQL and Flyway with schema validation; H2 is test-only. Translation data must never be included in migrations. API authentication uses JWT. Configure database credentials and independent internal/user JWT secrets through environment variables. Bodies are logged only when explicitly enabled, with permanent secret redaction and a bounded capture size. Merge requests run checks; the default branch packages and deploys immutable commit images after SSH credentials and the server are configured. See the complete container guides linked above.
