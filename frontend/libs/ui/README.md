# @persons/ui

`loading/retryLoad` повторяет только чтение данных с паузами 1–15 секунд, таймаутом 20 секунд и отменой через AbortSignal. `loading/LoadingFailureProvider` объединяет сообщения о сбоях; `loading/useLoadingFailure` сообщает о длительной ошибке и восстановлении, `loading/useRouteRetry` восстанавливает серверные страницы через Next.js retry. `loading/RequestError` оставляет валидацию рядом с полями и направляет недоступность сервиса в общее окно. Тексты и URL иллюстрации передаёт приложение. Записи не повторяются без идемпотентности. Подробности: frontend/home/docs/loading/ru.md.

English: the `loading/*` exports provide cancellable read retries with bounded backoff and timeouts, a shared dismissible failure dialog, route retries and inline validation handling. Applications supply localized copy and the illustration URL. Dismissing the dialog keeps read retries running. Writes require an idempotency contract before replay. See frontend/home/docs/loading/en.md.

Skeleton для изображений и аватарок.

`LoadedImage`, `LoadedAvatar`, `useImageState` сохраняют геометрию при загрузке, плавно показывают изображение, обрабатывают ошибку. Используются Gravity Box/Skeleton/Avatar. Учитывайте reduced motion для всех новых async-регионов.

`LoadedImage responsive` заполняет ширину родителя, сохраняет пропорции `width/height` и показывает Skeleton того же размера. Передавайте реальные размеры ассета; без responsive сохраняется фиксированная геометрия.

`TextMarquee` — бесшовная цветная лента из Gravity Box/Flex/Text без рамок. Слова идут с компактными постоянными отступами; количество повторений автоматически подстраивается под ширину контейнера и размер текста, без растягивания слов на весь экран. Цвета берутся из брендовых токенов темы. Передайте готовые переведённые строки: компонент не зависит от конкретного i18n-провайдера и подходит любому приложению.

```tsx
import { TextMarquee } from '@persons/ui';

<TextMarquee
    items={[t('diploma'), t('institution'), t('author')]}
    label={t('projectCredits')}
/>
```

Можно передать обычный массив `items={['Первый текст', 'Второй текст']}`. `loading` показывает skeleton до готовности данных. Пустой массив скрывает строку. Наведение и фокус приостанавливают движение; `prefers-reduced-motion` показывает неподвижный список с переносами. Для скринридеров повторяющаяся копия скрыта.

Source TypeScript + CSS Modules. Установите peers в приложении, добавьте пакет в Next transpilePackages. Локально: file dependency из frontend/id, после изменения — npm ci там же. Проверки: frontend/id npm run check и test:e2e. Собственный GitLab CI проверяет package и публикует в npm registry на default branch с версией 0.1.0-<pipeline iid>.

English: reusable React source package with CSS Modules. Install peers in the consumer and enable Next transpilePackages. Checks run through frontend/id. The project CI validates packaging and publishes versioned packages to GitLab Registry; credentials come from CI variables.

`TextMarquee view="glass"` использует нейтральный текст, разделитель `•` и полупрозрачный фон с размытием 24px без рамки. `BottomMarquee` из `@persons/ui/BottomMarquee` принимает те же переведённые `items` и `label`, закрепляет ленту снизу и обновляет `--persons-bottom-marquee-height` для отступов содержимого, включая safe area и переносы при reduced motion. Монтируйте одну нижнюю ленту на приложение, только на основных экранах после загрузки. `useMarqueePreference` из `@persons/ui/BottomMarquee/useMarqueePreference` сохраняет скрытие в localStorage, синхронизирует вкладки и возвращает результат сохранения для отображения ошибки.

English: `TextMarquee view="glass"` provides neutral text, solid bullet separators and borderless glass. `BottomMarquee` fixes the strip to the viewport bottom and publishes its measured height as `--persons-bottom-marquee-height`; consumers use it to offset controls and page content. Supply translated strings and mount one bottom strip on loaded content screens. `useMarqueePreference` persists visibility in the browser, synchronizes tabs and reports storage failures.
