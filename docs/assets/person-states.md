# Иллюстрации пустых состояний и 404

Созданы встроенным imagegen 17 октября 2026. Для каждой использовано ровно одно исходное фото из согласованной папки `Desktop/люди`; исходники фотографий в репозиторий не включаются. Прозрачность сохранена в WebP. Финальные файлы находятся в `frontend/assets/illustrations/` и при инициализации MinIO копируются в публичный S3-префикс `persons/assets/`.

| Файл | Единственный референс | Использование |
| --- | --- | --- |
| `empty-wall-krel-v1.webp` | `крел.png` | Пустая стена и комментарии |
| `empty-media-tyamik-v1.webp` | `тямик.png` | Пустые фотографии и моменты |
| `empty-history-vadim-v1.webp` | `вадим.png` | Нет истории, уведомлений или заявок |
| `not-found-vadim-v1.webp` | `вадим.png` | 404, включая отсутствующую персону |

## Промпты

### Стена

Create one humorous empty-wall website illustration. Use only the attached photo as identity reference for Krel: preserve his real recognizable young fair-skinned round face, short brown haircut, facial proportions and slight smile. Only one person. Krel in a violet sweatshirt kneels beside a comically pristine small freestanding lavender message wall, inspecting it very seriously through a magnifying glass; the wall has just one tiny blank sticky note and a curious little cobweb in a corner. His expression says he is trying very hard to find a first comment. No letters or text anywhere. Expressive semi-realistic cartoon, clean subtle outline, soft painterly shading, warm humorous style, lilac/violet and warm neutral palette. Isolated compact vignette on genuinely transparent background, subtle ground shadow, complete person and props with comfortable padding, landscape 4:3 composition. Avoid generic face replacement, other people, glasses, busy scenery, frames, watermarks.

### Медиа

Create one funny empty-media website illustration. Sole identity reference is the attached Tyamik photo. Preserve his recognizable very short light hair, fair skin, broad round face, nose, eyes and calm slightly smug expression. One person only. Tyamik in a coral sweatshirt has dramatically turned an open violet media storage box upside down; only one tiny dust puff falls out. Beside him, a small empty lavender picture frame and a little clapperboard make it obvious there are no photos or video moments yet. He gives a comic embarrassed shrug with one free hand. Clear anatomy, exactly two hands. No letters or digits anywhere. Semi-realistic friendly cartoon with clean subtle outlines and soft painterly shading matching a violet friends-community site. Isolated compact full vignette on a truly transparent background, minimal soft ground shadow, no scene background, landscape 4:3 composition. Keep this actual friend's face, do not make a generic avatar. No glasses, other characters or watermark.

### История

Create one amusing empty-history/notifications website illustration. The attached photo of Vadim is the ONLY identity reference. Preserve his actual recognizable elongated face, distinctive prominent long nose, close-set eyes, straight light brown side-swept hair and funny slightly sorrowful expression. Clean skin without white foam or streaks. One person only, no glasses. Vadim in a lilac cardigan sits on a tiny stool, holding an absurdly long unfurled completely blank paper scroll and looking at it as if searching for any news. The scroll gently curls on the floor, empty with no text, numbers, symbols or marks. Expressive friendly semi-realistic cartoon, clean fine outlines, soft painterly shading, restrained violet and cream colors, light gentle humor. Compact isolated vignette on genuinely transparent background with subtle floor shadow, landscape 4:3 framing, all head, feet and paper visible with padding. No other people, no scene background, no frame, no watermarks.

### 404

Use case: identity-preserve. Create ONE polished humorous full-body illustration for a 404 page in a friendly Russian friends community website with a violet palette. Input image is the sole identity reference: Vadim. Preserve this particular man's recognizable elongated face, prominent long nose, close-set light eyes, fair skin, straight light brown side-swept hair and slightly tragic funny expression; do not replace him with a generic handsome face. Clean face with no white foam or streaks. He stands upright fully visible from hair to both shoes, wearing a lavender hoodie, casual dark trousers and sneakers. He holds a large off-white rectangular sign in front of his waist with one hand, and points at its digits with the index finger of the other hand. Exact sign text, large clean bold dark purple numerals: "404". Nothing else written anywhere. Clear hand anatomy, exactly two hands. Semi-realistic cartoon illustration with expressive face, clean subtle outlines, soft painterly shading, restrained violet accents, warm welcoming humor, high quality. Isolated cutout on a truly transparent background, no frame, no room or scene background, only a subtle soft ground shadow. Portrait composition, comfortably framed full body including shoes and sign with padding. No other people, no other identity sources, no glasses, no watermarks.

## Иконки соцсетей

SVG в `frontend/assets/social/` получены из [Simple Icons](https://github.com/simple-icons/simple-icons) (CC0): [Telegram](https://github.com/simple-icons/simple-icons/blob/develop/icons/telegram.svg), [Steam](https://github.com/simple-icons/simple-icons/blob/develop/icons/steam.svg), [Discord](https://github.com/simple-icons/simple-icons/blob/develop/icons/discord.svg). Сами знаки принадлежат соответствующим платформам. В приложении выдаются из S3 через разрешённые `/media/social-*.svg`.
