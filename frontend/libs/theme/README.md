# @persons/theme

Системная тема и переключатель.

`PersonsThemeProvider` оборачивает Gravity ThemeProvider, сохраняет light/dark/system в cookie, отслеживает matchMedia. `ThemePicker`: dropdown/menu/inline. Передайте preference/resolvedTheme из SSR; подключите Gravity styles и theme tokens приложения.

`useThemeMenuItems({light, dark, system})` принимает переведённые подписи и возвращает готовые `items` для вложенного Gravity DropdownMenu: иконки, текущий выбор и действия через тот же provider.

Пункты сохраняют нативную высоту Gravity Menu при тексте 14px. Dropdown ThemePicker использует --g-popup-border-width: 0px.

Provider подключает общую `typography.css`: семейство из `--font-persons` (экспорт `@persons/assets/fonts`), основной текст и кнопки 14px, крупный основной текст 16px. Навигационные заголовки могут использовать локальный caption 12px. Пункты языка и темы используют 14px, включая вложенные меню. Все приложения подключают один и тот же шрифт; определения `next/font` в компонентах не дублировать.

Source TypeScript + CSS Modules. Установите peers в приложении, добавьте пакет в Next transpilePackages. Локально: file dependency из frontend/id, после изменения — npm ci там же. Проверки: frontend/id npm run check и test:e2e. Собственный GitLab CI проверяет package и публикует в npm registry на default branch с версией 0.1.0-<pipeline iid>.

English: reusable React source package with CSS Modules. Install peers in the consumer and enable Next transpilePackages. Checks run through frontend/id. The project CI validates packaging and publishes versioned packages to GitLab Registry; credentials come from CI variables.
