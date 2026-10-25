# @persons/i18n

Переводы, флаги, выбор языка.

`I18nProvider`, `useTranslate(namespace)`, `useLocale`, `loadMessages(locale, basePath, defaults)`. Defaults задаёт приложение, сервер переопределяет значения. `LanguagePicker`: dropdown/menu/inline. `Flag`: 271 SVG из flag-icons (MIT, LICENSE рядом). Экспорт @persons/i18n/flags/ru.svg. Скопируйте assets/flags в public/assets/flags. Country code не равен language code. Backend JSON-каталогов нет.

`useLanguageMenuItems()` возвращает `items` для вложенного Gravity DropdownMenu, а также `locale`, `pending`, `choices` и `choose(locale)`. LanguagePicker использует тот же hook. Передайте в `I18nProvider` каталоги обеих локалей через `catalogs={{ ru, en }}`: язык меняется через History API без повторного монтирования страницы и загрузки данных. Провайдер выбирает каталог по текущему `usePathname` и синхронизирует `html lang`; вложенный ThemeProvider должен получать актуальный `useLocale()`. Сохраняются basePath, query, hash, прокрутка и состояние компонентов. Если каталог языка не передан, используется обычная клиентская навигация. Выбор текущего языка ничего не меняет.

Pass both locale catalogs to `I18nProvider` using `catalogs={{ ru, en }}` to switch through the History API without remounting the page or fetching its data again. The provider selects messages from `usePathname` and updates `html lang`; nested ThemeProvider instances should read the current `useLocale()`. The application base path, query, hash, scroll and component state are preserved. Missing catalogs fall back to client-side navigation, and selecting the current language does nothing.

Пункты используют текст 14px с нативной высотой Gravity Menu; локальный line-height не сжимает строки. Dropdown LanguagePicker отображается без рамки через --g-popup-border-width.

Source TypeScript + CSS Modules. Установите peers в приложении, добавьте пакет в Next transpilePackages. Локально: file dependency из frontend/id, после изменения — npm ci там же. Проверки: frontend/id npm run check и test:e2e. Собственный GitLab CI проверяет package и публикует в npm registry на default branch с версией 0.1.0-<pipeline iid>.

English: reusable React source package with CSS Modules. Install peers in the consumer and enable Next transpilePackages. Checks run through frontend/id. The project CI validates packaging and publishes versioned packages to GitLab Registry; credentials come from CI variables.
