# Persons · id

Базовый Kotlin-пакет: `com.persons.id`. Серверный контракт и JVM-клиент генерируются в подпакетах этого пространства.

Вход, регистрация, восстановление пароля и управление сессиями Persons.

## Структура

- `app/api` — приложение, конфигурация профилей, JPA, Flyway и тесты.
- `app/contract/api` — OpenAPI и generated серверные интерфейсы.
- `app/contract/client` — Kotlin-обёртка generated-клиента.
- `app/contract/client/openapi` — generated Kotlin WebClient.
- `app/contract/client/typescript` — generated TypeScript Fetch SDK.

Каждый сервис имеет собственный Gradle Wrapper. Локальные библиотеки подключаются через Gradle composite builds. Нужны JDK 21, Node 24.11.1 и npm 11; запускать из `backend/id`:

```sh
./gradlew build
./gradlew generateClients
./gradlew :app:api:bootRun --args='--spring.profiles.active=dev'
```

Windows: `gradlew.bat` вместо `./gradlew`. При проблеме Java Unix-domain sockets на Windows используйте `frontend/id/tools/gradle.ts`: helper выбирает отдельный кэш текущего пользователя. Выход сборки — игнорируемый `.build` каждого модуля. Его создаёт Gradle, исходниками он не является.

## Поведение

JWT HS256 содержит `sub`, `jti`, `iss`, `aud`, `iat`, `exp`, `scope`. Подпись, audience, scope и запись сессии проверяются при каждом обращении. В БД хранится HMAC-отпечаток токена, IP, ОС/версия, браузер, устройство, источник, даты и отзыв. Выход и восстановление пароля отзывают сессии. Во фронтенде JWT находится в HttpOnly cookie, BFF передаёт `Authorization: Bearer …`; отдельного CSRF-токена нет.

`@RequireUser`, `@CurrentUser` и `UserContext.current()` предоставляются `backend/libs/id-context`. Внутренние вызовы требуют также короткий JWT в `X-Service-Authorization`. Указанным IP из заголовка доверяем только при валидном внутреннем JWT.

Письма лежат в `app/api/src/main/resources/templates/mail`. До включения регистрации нужно добавить namespace `mail` в i18n: `registerSubject`, `registerTitle`, `registerText`, `recoverySubject`, `recoveryTitle`, `recoveryText`, `codeLabel`, `expiry`, `ignore`, `footer`, а для смены почты — `emailChangeSubject`, `emailChangeTitle`, `emailChangeText`. Без них операция вернёт ошибку доступности, пустое письмо отправлено не будет.

История Arduino и протокола: [legacy-integration.md](docs/legacy-integration.md).

Аватары хранит сам id через AWS SDK в приватном S3. Проверенный JPEG сохраняется вместе с регистрацией, затем фоновая задача переносит его в S3; после успеха остаётся ключ объекта. Старые ключи сохраняются, повторная загрузка не требуется. Сбой сохраняет очередь и повторяет попытку через минуту. Настройки — игнорируемый app/api/docker/.env. [Аккаунт и S3 RU](docs/account-settings/ru.md) · [EN](docs/account-settings/en.md).

Swagger UI в профиле dev: [localhost:18081/swagger-ui/index.html](http://localhost:18081/swagger-ui/index.html). Интерфейс использует контракт из `/openapi/api.yaml`; генерация альтернативного определения через `/v3/api-docs` отключена. В testing и production Swagger UI отключён.

## Настройки

Порт `8081`, health `/actuator/health`. Профили `dev`, `tests`, `testing`, `production`. H2 используется только в тестах; dev/testing/production — PostgreSQL. `DB_URL`, `DB_USER`, `DB_PASSWORD`, `PROJECT_INTERNAL_JWT_SECRET` обязательны вне dev. Для id дополнительно `ID_JWT_SECRET`, `ID_PEPPER`, `MAIL_BASE_URL`, `I18N_BASE_URL`, S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_OBJECT_PREFIX. Для mail: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`.

Общий request logger подключён к каждому сервису. `X-Request-ID` передаётся по цепочке. `PROJECT_LOG_BODIES=true` включает тела JSON с ограничением 65536 байт; `project.observability.masked-fields` и `masked-headers` принимают маски `*`. Пароли, OTP, grants, токены, cookie, HTML писем и данные аватаров скрываются всегда. Большие тела помечаются как обрезанные; файлы не пишутся в журнал. Для поиска по request id нужен сбор stdout в выбранную систему логов; внешнее хранилище логов пока не подключено.

## CI и контейнеры

[.gitlab-ci.yml](.gitlab-ci.yml): MR — сборка, ktlint, OpenAPI и тесты; default branch — образ, публикация Kotlin/TypeScript SDK и SSH deploy. Общая настройка GitLab и секретов: [nginx README](../nginx/README.md). Деплой начнёт работать после предоставления credentials и подготовки сервера. Реальный production сейчас не развёрнут.

Инструкции: [Docker / Podman RU](app/api/docker/DOCKER_ru.md), [EN](app/api/docker/DOCKER_en.md).

## English

In dev, Swagger UI is available at [localhost:18081/swagger-ui/index.html](http://localhost:18081/swagger-ui/index.html) and loads the schema from `/openapi/api.yaml`. The generated `/v3/api-docs` definition is disabled. Swagger UI is disabled in testing and production.


Sign-in, registration, password recovery and session management for Persons. Run `./gradlew build` from `backend/id` with JDK 21 and Node 24.11.1. The independent wrapper builds the application, validates OpenAPI, generates Kotlin/TypeScript clients and runs tests. Local composite builds resolve sibling libraries. Generated output lives in ignored `.build` directories.

Avatars are stored privately by id through AWS SDK S3. Existing object keys are preserved; pending normalized JPEGs remain durable until upload succeeds. Configure the ignored app/api/docker/.env. See account-settings documentation above.

Use PostgreSQL and Flyway with schema validation; H2 is test-only. Translation data must never be included in migrations. API authentication uses JWT. Configure database credentials and independent internal/user JWT secrets through environment variables. Bodies are logged only when explicitly enabled, with permanent secret redaction and a bounded capture size. Merge requests run checks; the default branch packages and deploys immutable commit images after SSH credentials and the server are configured. See the complete container guides linked above.
