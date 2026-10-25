# Docker / Podman

Выполняйте команды из корня репозитория. Нужен Docker Compose v2. Для `podman compose` установите Compose provider.

```powershell
./scripts/setup.ps1
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose logs -f id mail
docker compose down
```

Эквивалентные команды Podman: `podman compose config`, `podman compose up --build -d`, `podman compose logs -f id mail`, `podman compose down`. Результаты фактического запуска перечислены в [проверках](../docs/verification.md); Podman отдельно не запускался.

`down` сохраняет именованные тома. **`docker compose down -v` / `podman compose down -v` безвозвратно удаляет локальные данные PostgreSQL и S3.**

Фронтенды: 3000 (ID), 3001 (админка), 3002 (person). `web-gateway` направляет эти порты во внутренние Next.js-сервисы и перезаписывает заголовки IP клиента. Backend health endpoints: 8081 (ID), 8082 (i18n), 8083 (mail), 8085 (Person), 8087 (Kotlin gateway), 8088 (Restrictions), путь `/actuator/health`. PostgreSQL доступен на 54320, Redis на 6379 только локально, SMTP на 1025, Mailpit на 8025, S3 на 9000, консоль S3 на 9001. Порты привязаны к loopback. Production Redis не публикует порт. [Перенос блокировок и новые секреты](../docs/deployment/restrictions_ru.md).

Flyway применяет миграции при запуске; JPA использует `ddl-auto=validate`. Инициализатор MinIO публикует только `persons/assets/*` и загружает версионированные иллюстрации и SVG-логотип. Префикс аватаров остаётся приватным.

`.env` содержит локальные реквизиты и не попадает в образы. Для внешней почты задайте `SMTP_*` и `MAIL_FROM`; без них используется Mailpit. Backend JVM работает под UID 10001, frontend Node — под пользователем `node`. Next standalone включает public-файлы и `.next/static`. Dockerfile бэкендов находятся в `backend/<service>/app/api/docker`, фронтендов — в `frontend/<app>/docker`.

Для запуска на основе уже собранных локальных артефактов:

```powershell
docker compose -f docker-compose.yaml -f docker/compose.prebuilt.yaml up --build -d
```

Этот вариант требует все четыре `bootJar` и три Next.js standalone-сборки. Обычная сборка из исходников не требует локальных результатов сборки. После изменения общих frontend-библиотек повторите `npm ci`: локальные file-зависимости упаковываются с `install-links=true`.

Профили dev/testing/prod для person описаны в [его инструкции](../frontend/person/docker/DOCKER_ru.md). За пределами локальной разработки используйте HTTPS, собственные публичные URL и реквизиты SMTP/S3. Текущий общий Compose предназначен для локального экземпляра.
