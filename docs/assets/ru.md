# Brand assets

Общий источник — `frontend/assets`. `logo.svg` — векторный портрет Вадима, созданный по предоставленной с его согласия фотографии: длинная чёлка, хмурые брови и характерное выражение лица. Портрет сгенерирован встроенным imagegen, затем переведён в SVG-контуры через VTracer 0.6.11; встроенных растровых изображений в SVG нет. Сгенерированный исходник сохранён в `branding/vadim-generated-v1.png`, исходная фотография в проект не копируется. SVG и производные PNG/ICO используются обоими приложениями, включая metadata-иконки. [Промпты](prompts.md). Golos Text поставляется локально по OFL; минимальный размер текста — 16px.

`illustrations/friends-v1.webp` was generated with the built-in imagegen tool from user-supplied, consented reference photos of Артём, Вадим, крел, Слава and Тямик. A second edit corrected Vadim and Tyamik. Reference photos are not committed or uploaded by the application. [Prompt record](prompts.md).

Compose uploads `logo.svg`, `mail.svg` and the friend illustration to the public S3 prefix `persons/assets/`. Both applications use the allowlisted `/media/` server route, configured with `ASSET_BASE_URL`. Other object names return 404. Assets reserve their layout space and show matching skeletons during decoding. The illustration uses a cream art background and remains readable in both light and dark themes.

Avatars use the shared photo editor and private S3 objects. They are not repository assets and are served only through authenticated endpoints. Favicons and fonts are delivered with the Next.js artifact. Source asset copies are retained for repeatable S3 initialization; application screens do not use local copies as an S3 fallback.

To replace artwork, update the source, use a new versioned filename or URL version, update the allowlist and initialization script when necessary, rerun `docker compose run --rm minio-init`, and rebuild the frontend if references changed. Public media is cached for one hour; versioning avoids stale content. The current logo URL is `/media/logo.svg?v=vadim-v1`. Never enable public access for the avatar prefix.
# Обновлённые изображения

`upload-evgeny-v1.webp` — Женя загружает фото и видео в облако. Иллюстрация создана встроенным imagegen по согласованному референсу, имеет прозрачный фон и используется общей формой выбора файлов на сайте и в CMS. [Промпт](../../frontend/assets/illustrations/upload-evgeny-v1.prompt.json).

Текущие восемь сцен главной и шесть пустых состояний: [итоговые промпты, референсы и пути файлов](community-generation.json). Встроенный imagegen, согласованные фотографии друзей. На главной действие справа; Никита использует обновлённый референс. 404 сохранена. Новые WebP находятся в `frontend/assets/illustrations`, `minio-init` загружает их в S3.


`cookies-vadim-v1.webp` — Вадим ест печеньку в нижнем блоке выбора cookie. Встроенный imagegen использовал существующую согласованную иллюстрацию Вадима как референс; исходные фотографии не добавлялись. Прозрачный WebP весит около 42 КБ. [Промпт](../../frontend/assets/illustrations/cookies-vadim-v1.prompt.json).

Пустые состояния игр: `empty-dota-lifestealer-vadim-v3.webp` и `empty-cs-sas-vadim-v2.webp`. Оба перерисованы отдельными сабагентами встроенным imagegen непосредственно по согласованному `люди/вадим.png`: сохранены черты лица, чёлка и характерное выражение. Прежние версии сохранены для истории; потребители используют новые версии. Промпты находятся рядом с WebP.


## Пустые состояния, 23 октября 2026

Аудит охватил публичный фронтенд, CMS, общие компоненты профиля/аккаунта и формы ID. Поиск, селекты людей, рекомендации, сессии, ограничения страниц и отсутствие владельца теперь показывают компактную иллюстрацию с пояснением. Таблицы CMS получили предметные сцены вместо одной иконки, лента — сцену стены, публикации — отдельную иллюстрацию. Загрузка и ошибки сохраняют свои состояния; формы, кнопки и фильтры остаются доступны.

Новые прозрачные WebP (640×640) созданы отдельным сабагентом на каждую сцену: `empty-search-artem-v1`, `empty-sessions-nikita-v1`, `empty-restrictions-yuri-v1`, `empty-publications-krel-v1`, `empty-moderation-slava-v1`, `empty-settings-evgeny-v1`. Все используют оригинальные согласованные фотографии из папки `люди`, точные промпты сохранены в соседних `.prompt.json`. Исходные фотографии в репозиторий не добавляются.

Общий `EmptyState` поддерживает компактную и обычную композиции, локализованные alt/подписи, обе темы, skeleton изображения и действие. Контекст выбирается явно в `ListTable` и в списках сайта. Новые имена добавлены в allowlist обоих приложений и `docker/minio/initialize.sh`; для существующего окружения требуется повторить `minio-init` и пересобрать фронтенды.
