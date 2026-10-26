<div align="center">

<img src="frontend/assets/logo.svg" width="72" alt="Логотип «Те ещё люди»">

# Те ещё люди

### Свои люди. Свои истории.

Страницы друзей, общие воспоминания, достижения и игровые истории.

[![Status](https://img.shields.io/badge/status-active%20development-7860E8?style=flat-square)](docs/wiki/Archive.md)
[![Kotlin](https://img.shields.io/badge/Kotlin-Spring%20Boot-7F52FF?style=flat-square&logo=kotlin&logoColor=white)](backend)
[![Next.js](https://img.shields.io/badge/Next.js-TypeScript-171717?style=flat-square&logo=nextdotjs&logoColor=white)](frontend)
[![Gravity UI](https://img.shields.io/badge/UI-Gravity%20UI-FFBE5C?style=flat-square)](frontend/libs/ui)
[![Languages](https://img.shields.io/badge/i18n-ru%20%2F%20en-34867C?style=flat-square)](frontend/libs/i18n)

[**Открыть сайт ↗**](https://kreeeeeel.ru) · [**Wiki**](docs/wiki/Home.md) · [**Возможности**](docs/wiki/Features.md) · [**Скриншоты**](docs/wiki/Screenshots.md) · [English](README_en.md)

</div>

![Главная страница действующего сайта](docs/screenshots/home.png)

## О проекте

«Те ещё люди» — небольшой социальный проект для компании друзей. У каждого человека есть своя страница: с историями на стене, фотографиями, моментами, отзывами и достижениями. Отдельные ID и CMS отвечают за аккаунты и управление сообществом.

**Разработка возобновлена 26 октября 2026 года.** Добавлены [даты профиля, армейский таймер, общая галерея и мобильная компоновка](docs/person/military-service_ru.md). Этот репозиторий содержит полную копию исходников; история компонентов и production CI остаются в [GitLab](https://gitlab.com/te-eshche-lyudi). Архивный релиз от 25 октября сохранён.

## Что умеет

| | Возможности |
| --- | --- |
| **Люди** | Поиск, каталог с сортировкой, персональные страницы, теги и социальные ссылки |
| **Истории** | Стена, оценки с отзывами и эмодзи, комментарии, реакции и лента |
| **Медиа** | Фотографии и видео, отметки людей, превью, просмотр и комментарии |
| **Сообщество** | Достижения, репутация, займы и запросы на привязку своей страницы |
| **Игры** | История Dota 2, карточки и детали матчей; импорт OpenDota по Steam-профилю; история CS2 и импорт Leetify |
| **ID** | Регистрация через почту, восстановление пароля, Яндекс ID, аватар и управление сеансами |
| **CMS** | Люди и аккаунты, роли, модерация, блокировки, достижения, настройки и журнал действий |
| **Интерфейс** | Русский и английский, светлая и тёмная темы, мобильная версия, reduced motion |

Подробности и границы реализации — в [каталоге возможностей](docs/wiki/Features.md). Настройки провайдера и внешний сервис влияют на доступность импорта матчей.

## Посмотреть

<table>
<tr>
<td width="50%"><img src="docs/screenshots/people.png" alt="Каталог людей"><br><b>Каталог сообщества</b></td>
<td width="50%"><img src="docs/screenshots/profile.png" alt="Страница персоны"><br><b>Страница человека</b></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/home-dark.png" alt="Тёмная тема"><br><b>Тёмная тема</b></td>
<td width="50%"><img src="docs/screenshots/sign-in.png" alt="Вход в ID"><br><b>Отдельный ID</b></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/dota-match.png" alt="Матч Dota 2"><br><b>Dota 2 · OpenDota</b></td>
<td width="50%"><img src="docs/screenshots/cs2.png" alt="История CS2"><br><b>CS2 · Leetify</b></td>
</tr>
</table>

Скриншоты сделаны с действующего сайта 25 октября 2026 года, в отдельной анонимной сессии. [Галерея и мобильная версия →](docs/wiki/Screenshots.md)

## Как устроен

```mermaid
flowchart LR
    U[Браузер] --> N[Nginx / HTTPS]
    N --> P[Person · Next.js]
    N --> I[ID · Next.js]
    N --> C[CMS · Next.js]
    P & I & C --> B[BFF]
    B --> G[Gateway + Restrictions]
    G --> ID[ID API]
    G --> API[Person API]
    ID & API --> DB[(PostgreSQL)]
    ID & API --> S3[(S3)]
    API --> R[(Redis)]
    W[Person Worker] --> DB
    W --> S3
    W --> D[OpenDota / Leetify]
    M[Mail + i18n] --> DB
```

Kotlin, Spring Boot, Spring Data JPA, Flyway и OpenAPI на сервере; TypeScript, Next.js App Router, React, Gravity UI и CSS Modules на клиенте. Общие библиотеки предоставляют темы, локализацию, UI, редактор фото и динамические свойства. [Архитектура →](docs/wiki/Architecture.md)

## Запуск из публичного репозитория

```sh
git clone https://github.com/kreeeeeel/persons.git
cd persons
```

Все компоненты уже включены обычными файлами. Доступ к приватным GitLab submodules для этого checkout не нужен; `.gitmodules` сохранён как описание исходной структуры. Дальше выполните `./scripts/setup.ps1` в PowerShell или подготовьте `.env` по `.env.example` на Linux. Обычный запуск проекта: `docker compose up --build -d`. Это инструкция для самостоятельного восстановления, при архивировании локальное приложение не запускается.

Подробные требования, порты, генерация клиентов и проверки — [Getting Started](docs/wiki/Getting-Started.md) и [исходная инструкция разработки](DEVELOPMENT_ru.md).

## Навигация по Wiki

| Раздел | Содержание |
| --- | --- |
| [Главная](docs/wiki/Home.md) | Карта проекта и документации |
| [Возможности](docs/wiki/Features.md) | Пользовательские сценарии и ограничения |
| [Скриншоты](docs/wiki/Screenshots.md) | Живой интерфейс на desktop и mobile |
| [Архитектура](docs/wiki/Architecture.md) | Сервисы, библиотеки, контракты и данные |
| [Локальный запуск](docs/wiki/Getting-Started.md) | Подготовка окружения и проверки |
| [Эксплуатация](docs/wiki/Operations.md) | Production, хранилище, конфигурация и CI |
| [Игровые интеграции](docs/wiki/Integrations.md) | DotaBuff, Steam и динамические свойства |
| [Архив проекта](docs/wiki/Archive.md) | Происхождение среза и восстановление |

## Происхождение и права

[SOURCE_REVISIONS.json](SOURCE_REVISIONS.json) фиксирует точные GitLab-ревизии 19 исходных репозиториев. Публичная копия собрана из этих ревизий без изменения прикладной логики; оформление и текущие скриншоты добавлены при архивировании. Закрытые данные пользователей, дампы, runtime-секреты и исходные референсные фотографии в неё не включены.

Публикация исходников сама по себе не предоставляет отдельную open-source лицензию. В исходном проекте единой лицензии нет; права на сторонние зависимости, игровые изображения, шрифт и брендовые материалы остаются у соответствующих правообладателей. [Подробнее](docs/archive/RIGHTS.md).
