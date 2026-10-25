# Локальный запуск и проверки

[← Главная Wiki](Home.md) · [Архитектура](Architecture.md)

Эта инструкция предназначена для самостоятельного восстановления проекта. Развитие завершено; команды не запускаются автоматически при чтении Wiki.

## Публичный checkout

```sh
git clone https://github.com/kreeeeeel/persons.git
cd persons
```

Исходники всех компонентов уже находятся в репозитории. `.gitmodules` описывает исходную GitLab-структуру, но обычный публичный checkout не требует доступа к ней. Точные исходные SHA находятся в `SOURCE_REVISIONS.json`.

## Через Compose

Нужны Docker Engine/Desktop с Linux-контейнерами и Compose v2. Production override требует Compose 2.24.4 или новее.

```powershell
./scripts/setup.ps1
docker compose up --build -d
docker compose ps
```

Скрипт создаёт игнорируемый `.env` со случайными локальными секретами и сохраняет существующий файл. На Linux скопируйте `.env.example` и замените все примерные значения. Для первого администратора задайте собственный `PERSONS_ADMIN_EMAIL`, зарегистрируйте и подтвердите этот аккаунт; после назначения удалите bootstrap-настройку.

| Приложение | Адрес |
| --- | --- |
| Person | http://localhost:3002/ru |
| ID | http://localhost:3000/ru |
| CMS | http://localhost:3001/ru |
| Mailpit | http://localhost:8025 |
| MinIO Console | http://localhost:9001 |

Для английского интерфейса замените `ru` на `en`. Локальные приложения должны использовать одинаковое имя хоста.

## Разработка без сборки внутри контейнера

Исходный проект использует JDK 21, Node.js 24.11.1 и npm 11. Сначала генерируются контрактные клиенты, затем устанавливаются зависимости фронтендов.

```powershell
cd backend/id
./gradlew.bat generateClients
cd ../i18n
./gradlew.bat generateClients
cd ../person
./gradlew.bat generateClients
cd ../../frontend/person
npm ci
npm run check
npm run build:prod
```

Аналогичные `npm ci`, `npm run check`, `npm run build:prod` выполняются для `frontend/id` и `frontend/person-admin`. Полный перечень backend-проверок — в `scripts/check-backend.ps1`. Подробности и контрактные зависимости сохраняет [исходный README](../../DEVELOPMENT_ru.md).

## Предпросмотр на фикстурах

В проекте сохранён отдельный mock API и инструменты предпросмотра. Они предназначены для проверки UI, не для production и не для восстановления реальных данных. [Инструкция](../community-preview/ru.md).

## Проверки

Backend использует Kotlin unit/integration-тесты и ktlint. Frontend — TypeScript, ESLint, Stylelint, Prettier, Vitest и Playwright. В инфраструктуре есть тесты выбора сборок, хранения, Nginx, деплоя и операционных команд. Публичный срез сохраняет эти проверки; полная повторная сборка при архивировании не выполнялась, прикладная логика не менялась.
