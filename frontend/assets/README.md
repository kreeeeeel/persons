# Персонажи — ассеты

[Источники, S3 и промпты](../../docs/assets/ru.md).

Пустые оценки: `illustrations/empty-ratings-yuri-v1.webp`, Юрий с пустой звездой. Встроенный image_gen по единственному согласованному `юрчик.jpg`, прозрачный фон. [Промпт](illustrations/empty-ratings-yuri-v1.prompt.json).

Пустые комментарии фото и моментов: `illustrations/empty-comments-slava-v1.webp`, Слава с пустым облаком диалога. Прозрачная иллюстрация, встроенный image_gen, 21 октября 2026. Единственный согласованный референс — `слава.png`; оригинал не включён. [Промпт](illustrations/empty-comments-slava-v1.prompt.json).

Новый каталог из девяти прозрачных PNG: `page-age-1-v1.png` … `page-age-5-v1.png` (изумрудный, синий, фиолетовый, рубиновый и золотой юбилеи), `drink-lover-v1.png`, `borrow-lover-v2.png` (грустный Евгений с пустым кошельком), `daylight-fear-v1.png`, `old-miller-lightweight-v1.png` (Вадим и «Старый Мельник»). [Определения и точные промпты](achievements/anniversaries-and-habits.json). [Импорт и автоматическая выдача](../../docs/person/automatic-achievements_ru.md).

Ошибки загрузки: `illustrations/error-page-stepa-slava-v1.webp` (Стёпа и Слава) и `illustrations/error-modal-nikita-v1.webp` (Никита с отключённым проводом). Прозрачные WebP, сгенерированные по согласованным фотографиям. [Промпты](illustrations/loading-error-prompts.json). Исходные фотографии не включены.

Одиннадцать прозрачных достижений: «Долгожитель» с Никитой, «Преданный слушатель Lil Peep» с прямой чёрной полосой в углу, «Жирный» с Крелом, «Вонючий» с Вадимом, «Сексуальный» с Юрчиком, «Каблук» и «Тюрьма» с Евгением, «Онлайн-футболист» с Артёмом (REMATCH), «Деменция» с Никитой, «Игрок в Доту» со Стёпой и «Любитель уральских пельменей» с радующимся Вадимом и табличкой шоу. [Определения и промпты](achievements/community-jokes.json). Импортируются тем же `scripts/seed-achievements.mts`, с проверкой изображений в S3 и без автоматической выдачи. Каталоги и PNG проверяются командой `npm test` в этом пакете.

Сцену с настольным футболом заменяет `illustrations/sofa-friends-v1.webp`: Тямик и Артём сидят на диване с пивом, слева оставлено место для интерфейса. [Промпт](illustrations/sofa-friends-v1.json).

Пустая история DotaBuff: Lifestealer с лицом Вадима, прозрачный WebP 640px. Промпт: illustrations/empty-dota-lifestealer-vadim-v1.prompt.json. Исходные фотографии не включены.
