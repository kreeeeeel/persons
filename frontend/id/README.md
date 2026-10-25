# Persons · id web

Вход использует общий векторный знак Persons и TextMarquee с подписями «Диплом», «ЛЭТИ», «Кафедра АПУ», «УТС», «Немтырев Кирилл» на ru/en. Та же лента и ассеты используются в home.

Самостоятельный Next.js App Router / TypeScript / Gravity UI проект. Нужны Node 24.11.1, npm 11, JDK 21 для генерации SDK. Из frontend/id:
```sh
npm run generate
npm ci
npm run assets
npm run dev
npm run check
npm run build:testing
npm run test:e2e
npm run build:prod
npm run start:prod
```

Сначала генерируйте SDK, потом npm ci: file dependencies устанавливаются как снимки, не как ссылки. После изменения общей библиотеки повторите npm ci. Node modules в корне репозитория не используется.

Форма входа и поле пароля запрашивают autocomplete=off вместо current-password; начальное значение пустое. Сохранённые пароли и принудительное заполнение дополнительно контролируются браузером или его менеджером паролей.

APP_ENV: dev/testing/prod. Вне dev обязательны ID_BASE_URL, I18N_BASE_URL, PROJECT_INTERNAL_JWT_SECRET. TRUST_PROXY=true допустим только за доверенным nginx. JWT хранится в HttpOnly cookie, BFF вызывает generated SDK. В testing/prod cookie Secure: для реального входа нужен HTTPS. Секреты для build не требуются.

Вход без карточки, восстановление, три шага регистрации, Gravity PinInput, повтор кода и редактор аватара: поворот, отражение, масштаб, круглый crop. Пароль задаётся на третьем шаге. Далее — mock home с профилем и сессиями. Перед регистрацией нужны переводы писем в i18n, см. backend/id/README.md.

**Данные и изображения загружаются со skeleton; на кнопках во время отправки показывается круглый Gravity Spin. Появление и смена состояния плавные.** Учитывается prefers-reduced-motion. Общие media primitives и `TextMarquee` — @persons/ui. На страницах входа, регистрации и восстановления переключатели темы и языка скрыты; снизу отображается бегущая строка с переведёнными подписями диплома. Темы light/dark/system и локализованные URL ru/en поддерживаются. Начальные UI-подписи в src/shared/i18n/messages.ts переопределяются БД и не наполняют её.

Пакеты: frontend/libs/i18n, theme, photo-editor, ui. Общие SVG и локальный Golos Text: frontend/assets. assets копирует логотипы и все 271 флагов в public. Флаг обозначает страну, а не однозначно язык. Общая типографика: [RU](docs/typography/ru.md), [EN](docs/typography/en.md).

[CI](.gitlab-ci.yml): MR — проверки, сборка, Playwright; default branch — образ и SSH deploy после настройки credentials. [Инфраструктура](../../backend/nginx/README.md). Контейнеры: [RU](docker/DOCKER_ru.md), [EN](docker/DOCKER_en.md).

## Сквозная проверка

`npx playwright test --config playwright.skeleton.config.ts` сравнивает геометрию загрузки и готовых форм входа/восстановления на desktop, mobile и в альбомной ориентации, в ru/en и light/dark. Проверка работает без backend и запрещает прокрутку документа в обоих состояниях.

Обычный `npm run test:e2e` проверяет интерфейс без внешних сервисов. Для проверки регистрации, SMTP и JWT запустите **отдельный** Compose project с Mailpit и пустой БД i18n, затем задайте `E2E_BASE_URL=http://localhost:3100` и `E2E_LIVE_STACK=true`. Live-тест добавляет тестовые переводы письма через API и создаёт аккаунт; его нельзя направлять в рабочую БД. После проверки удалите только ресурсы этого тестового Compose project.

На этой Windows-машине браузерные проверки выполнялись с `PLAYWRIGHT_CHANNEL=msedge`. В GitLab используется Chromium, установленный через Playwright. Проверены desktop/mobile, ru/en, темы, получение OTP, поворот и отражение фото, JWT cookie и отзыв сессии.

## English

Run `npx playwright test --config playwright.skeleton.config.ts` for isolated loading/ready geometry checks of login and recovery, including mobile landscape, both locales and themes, and document overflow.

Independent Next.js/Gravity UI application. Generate SDKs before npm ci, prepare assets, then run dev/check/build. Local packages install as snapshots; rerun npm ci after editing them. Configure APP_ENV dev/testing/prod, backend origins and the internal JWT secret at runtime. Production cookies require HTTPS; the BFF keeps session JWTs in HttpOnly cookies.

Login includes recovery, three-step signup, OTP and reusable avatar editing. Async regions use skeletons and smooth transitions with reduced-motion support. Initial UI labels never seed the translation database. Mail translations must be added separately before registration. Production deployment awaits credentials.
