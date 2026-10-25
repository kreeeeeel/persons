# person: Docker и Podman

Все команды выполняются из корня репозитория. Требуются Docker с Linux Engine и Compose v2 либо Podman с настроенной machine на Windows/macOS и установленным Compose provider, поддерживающим `include`. Образы фиксируют Node.js 24.11.1, Gradle 8.14.3/JDK 21; generated-клиенты и npm-пакеты собираются внутри образа. Хостовые Node/JDK не нужны для контейнерного запуска.

Подготовьте общий `.env` через `./scripts/setup.ps1` (на Linux — копирование `.env.example` с заменой секретов), проверьте `PUBLIC_ID_URL`, `PUBLIC_PERSON_URL`, `PUBLIC_ADMIN_URL` и SMTP. Секреты остаются runtime-параметрами. Person слушает 3000 внутри контейнера, gateway публикует его на 3002; ID — 3000, админка — 3001. Используйте один hostname для общей HttpOnly cookie.

Перед первым запуском соберите общие сервисы: `docker compose build` либо `podman compose build`. Далее выберите один UI-профиль. Не запускайте варианты одновременно на одинаковых портах. Бэкенды здесь — общий локальный стек; для отдельного стенда используйте отдельные данные и адреса.

`dev` запускает Next dev с Fast Refresh, bind mount исходников и отдельными Linux volumes для node_modules и .next. `testing` и `prod` запускают готовый standalone-сервер от пользователя node. Runtime-значения читаются на сервере, страницы динамические, NEXT_PUBLIC-конфигурации нет; один runtime-артефакт проверяется с APP_ENV=testing/prod.

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

## Отдельный контейнер

Скопируйте `frontend/person/docker/.env.example` в соседний `.env.local`, установите общий внутренний JWT-секрет и адреса. Пример использует существующую сеть локального стека. Для возврата из ID значение PUBLIC_PERSON_URL должно совпадать с выбранным публичным адресом person.

```powershell
docker build --target runtime -f frontend/person/docker/Dockerfile -t persons-person-web:manual .
docker run --rm --network persons_default --env-file frontend/person/docker/.env.local -p 127.0.0.1:3302:3000 persons-person-web:manual
podman build --target runtime -f frontend/person/docker/Dockerfile -t persons-person-web:manual .
podman run --rm --network persons_default --env-file frontend/person/docker/.env.local -p 127.0.0.1:3302:3000 persons-person-web:manual
```

Для локальной работы без контейнера установите Node 24.11.1/npm 11, сгенерируйте ID/i18n-клиенты существующим Gradle workflow, выполните в `frontend/person` `npm ci`, подготовьте `.env.local` по `.env.example`. Команды: `npm run dev`, `npm run build:testing` / `npm run start:testing`, `npm run build:prod` / `npm run start:prod`; `npm run check` проверяет код. Native dev использует 3002, поэтому освободите этот порт либо укажите другой порт и согласуйте публичные URL. Общие file-зависимости упакованы: после изменения frontend/libs повторите npm ci.

При проблемах проверьте health `/api/health`, backend/S3 URL, занятые порты, генерацию SDK и наличие font/media. Источник HTML писем — backend/id, отправитель — backend/mail. Параметры SMTP берутся из корневого `.env`. Сквозной тест с примерными адресами запускайте только с Mailpit.

Обычный `down` сохраняет данные. `down -v` удаляет volumes с PostgreSQL/S3 и dev-зависимостями; это отдельная операция с потерей данных. Docker и runtime-профили проверяются в текущей задаче; Podman здесь не запускался, его команды требуют совместимого Compose provider.
