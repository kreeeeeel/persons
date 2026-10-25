# Persons · mail

Базовый Kotlin-пакет: `com.persons.mail`. Серверный контракт и JVM-клиент генерируются в подпакетах этого пространства.

Асинхронная отправка писем через SMTP с постоянной очередью, идемпотентностью и повторами.

## Структура

- `app/api` — приложение, конфигурация профилей, JPA, Flyway и тесты.
- `app/contract/api` — OpenAPI и generated серверные интерфейсы.
- `app/contract/client` — Kotlin-обёртка generated-клиента.
- `app/contract/client/openapi` — generated Kotlin WebClient.
- `app/contract/client/typescript` — generated TypeScript Fetch SDK.

Каждый сервис имеет собственный Gradle Wrapper. Локальные библиотеки подключаются через Gradle composite builds. Нужны JDK 21, Node 24.11.1 и npm 11; запускать из `backend/mail`:

```sh
./gradlew build
./gradlew generateClients
./gradlew :app:api:bootRun --args='--spring.profiles.active=dev'
```

Windows: `gradlew.bat` вместо `./gradlew`. При проблеме Java Unix-domain sockets на Windows используйте `frontend/id/tools/gradle.ts`: helper выбирает отдельный кэш текущего пользователя. Выход сборки — игнорируемый `.build` каждого модуля. Его создаёт Gradle, исходниками он не является.

## Поведение

`POST /internal/v1/messages` принимает UUID идемпотентности, адрес, тему и HTML. `GET /internal/v1/messages/{id}` возвращает статус. Все внутренние маршруты требуют JWT с audience `persons-internal` и scope `service`.

Очередь в PostgreSQL. Планировщик берёт задачу под блокировкой, ограничивает число попыток и очищает HTML после завершения. SMTP обеспечивает доставку как минимум один раз: если процесс остановится после принятия письма SMTP, возможен повтор. В dev используется Mailpit; реальный SMTP задаётся переменными окружения. HTML строит вызывающий сервис, mail не хранит пользовательские переводы.

Swagger UI в профиле dev: [localhost:18083/swagger-ui/index.html](http://localhost:18083/swagger-ui/index.html). Интерфейс использует контракт из `/openapi/api.yaml`; генерация альтернативного определения через `/v3/api-docs` отключена. В testing и production Swagger UI отключён.

## Настройки

Порт `8083`, health `/actuator/health`. Профили `dev`, `tests`, `testing`, `production`. H2 используется только в тестах; dev/testing/production — PostgreSQL. `DB_URL`, `DB_USER`, `DB_PASSWORD`, `PROJECT_INTERNAL_JWT_SECRET` обязательны вне dev. Для id дополнительно `ID_JWT_SECRET`, `ID_PEPPER`, `MAIL_BASE_URL`, `I18N_BASE_URL`. Для mail: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`.

Общий request logger подключён к каждому сервису. `X-Request-ID` передаётся по цепочке. `PROJECT_LOG_BODIES=true` включает тела JSON с ограничением 65536 байт; `project.observability.masked-fields` и `masked-headers` принимают маски `*`. Пароли, OTP, grants, токены, cookie, HTML писем и данные аватаров скрываются всегда. Большие тела помечаются как обрезанные; файлы не пишутся в журнал. Для поиска по request id нужен сбор stdout в выбранную систему логов; внешнее хранилище логов пока не подключено.

## Подключение настоящей почты

Для Gmail подготовлен `app/api/docker/.env.example`: сервер `smtp.gmail.com`, порт `587`, аутентификация и обязательный STARTTLS. Скопируйте его в `app/api/docker/.env`, задайте полный Gmail-адрес в `SMTP_USER` и `MAIL_FROM`, а пароль приложения Google — в `SMTP_PASSWORD` без разделяющих пробелов. Локальный `.env` исключён из Git; credentials не добавляются в исходники, Dockerfile и CI. Настройки соответствуют [документации Gmail SMTP](https://support.google.com/mail/answer/7104828).

Запуск всего стека с Gmail из корня репозитория:

```sh
docker compose --env-file backend/mail/app/api/docker/.env -f backend/nginx/app/api/docker/compose.yaml up -d --build --wait
```

При запуске из `backend/mail/app/api/docker` достаточно `docker compose up -d --build --wait`: Compose автоматически читает соседний `.env`. Для изолированных тестов используйте общий Compose без этого env-файла — письма принимает Mailpit. `SMTP_AUTH`, `SMTP_STARTTLS` и `SMTP_STARTTLS_REQUIRED` позволяют выбрать режим локального SMTP; production всегда требует TLS и аутентификацию.

Другой SMTP-провайдер задаётся теми же `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` и `MAIL_FROM`. Для собственного домена нужен подтверждённый адрес отправителя.

Нужен доступ к DNS домена, чтобы установить записи подтверждения, SPF, DKIM и DMARC по инструкции выбранного провайдера. MX нужен для входящей почты, если требуется полноценный ящик. Секреты храните в локальном env или protected GitLab variables, в репозиторий их не добавляйте.

До регистрации заполните namespace `mail` в i18n для поддерживаемых языков: ключи перечислены в [id README](../id/README.md). Переводы добавляются через API, миграции остаются только схемой БД. Настройка SMTP не добавляет переводы автоматически.

## CI и контейнеры

[.gitlab-ci.yml](.gitlab-ci.yml): MR — сборка, ktlint, OpenAPI и тесты; default branch — образ, публикация Kotlin/TypeScript SDK и SSH deploy. Общая настройка GitLab и секретов: [nginx README](../nginx/README.md). Деплой начнёт работать после предоставления credentials и подготовки сервера. Реальный production сейчас не развёрнут.

Инструкции: [Docker / Podman RU](app/api/docker/DOCKER_ru.md), [EN](app/api/docker/DOCKER_en.md).

## English

In dev, Swagger UI is available at [localhost:18083/swagger-ui/index.html](http://localhost:18083/swagger-ui/index.html) and loads the schema from `/openapi/api.yaml`. The generated `/v3/api-docs` definition is disabled. Swagger UI is disabled in testing and production.


Asynchronous SMTP delivery with a persistent queue, idempotency and retries. Run `./gradlew build` from `backend/mail` with JDK 21 and Node 24.11.1. The independent wrapper builds the application, validates OpenAPI, generates Kotlin/TypeScript clients and runs tests. Local composite builds resolve sibling libraries. Generated output lives in ignored `.build` directories.

For Gmail, copy `app/api/docker/.env.example` to the ignored `app/api/docker/.env`. Set the full Gmail address, a Google app password without grouping spaces, and the matching sender address. Gmail uses `smtp.gmail.com:587` with authentication and mandatory STARTTLS. Pass `--env-file backend/mail/app/api/docker/.env` when running the root Compose stack; Compose loads the adjacent file automatically when using the mail wrapper. Run isolated tests without this env file to keep using Mailpit. Mail translations must still be supplied through the i18n API.

Use PostgreSQL and Flyway with schema validation; H2 is test-only. Translation data must never be included in migrations. API authentication uses JWT. Configure database credentials and independent internal/user JWT secrets through environment variables. Bodies are logged only when explicitly enabled, with permanent secret redaction and a bounded capture size. Merge requests run checks; the default branch packages and deploys immutable commit images after SSH credentials and the server are configured. See the complete container guides linked above.
