# Brand assets

The shared source is `frontend/assets`. `logo.svg` is a vector portrait of Vadim based on his consented reference photo, preserving his side-swept fringe, knit eyebrows and distinctive pout. The built-in imagegen tool generated the portrait; VTracer 0.6.11 converted it into SVG paths without embedded raster images. The generated source is saved as `branding/vadim-generated-v1.png`; the original photograph stays outside the project. Both frontends use the same SVG and derived PNG/ICO metadata icons. [Prompts](prompts.md). Golos Text is bundled locally under its OFL license (`frontend/assets/fonts/OFL-GolosText.txt`). All text is at least 16px.

`illustrations/friends-v1.webp` was generated with the built-in imagegen tool from user-supplied, consented reference photos of Артём, Вадим, крел, Слава and Тямик. A second edit corrected Vadim and Tyamik. Reference photos are not committed or uploaded by the application. [Prompt record](prompts.md).

Compose uploads `logo.svg`, `mail.svg` and the friend illustration to the public S3 prefix `persons/assets/`. Both applications use the allowlisted `/media/` server route, configured with `ASSET_BASE_URL`. Other object names return 404. Assets reserve their layout space and show matching skeletons during decoding. The illustration uses a cream art background and remains readable in both light and dark themes.

Avatars use the shared photo editor and private S3 objects. They are not repository assets and are served only through authenticated endpoints. Favicons and fonts are delivered with the Next.js artifact. Source asset copies are retained for repeatable S3 initialization; application screens do not use local copies as an S3 fallback.

To replace artwork, update the source, use a new versioned filename or URL version, update the allowlist and initialization script when necessary, rerun `docker compose run --rm minio-init`, and rebuild the frontend if references changed. Public media is cached for one hour; versioning avoids stale content. The current logo URL is `/media/logo.svg?v=vadim-v1`. Never enable public access for the avatar prefix.
# Updated artwork

The current eight hero scenes and six empty states are recorded in the [final generation manifest](community-generation.json), including prompts, consented references and output paths. Built-in imagegen was used. Hero subjects are on the right; Nikita uses the updated reference. The 404 is preserved. Final WebP files live in `frontend/assets/illustrations` and are uploaded to S3 by `minio-init`.



## Empty states, 23 October 2026

The public site, CMS, shared profile/account components and ID forms were audited. Search, people pickers, recommendations, sessions, page restrictions and missing account ownership now use illustrated empty states. CMS tables explicitly choose a contextual illustration; the feed and personal publications use their own scenes. Loading, errors and forms retain their behavior.

Eight transparent 640×640 WebP assets were generated with built-in image_gen by one subagent per illustration, using the original consented friend photographs: Vadim as Lifestealer/SAS, Artem for search, Nikita for sessions, Yuri for restrictions, Krel for publications, Slava for moderation, Evgeny for settings. Exact prompts are stored alongside each image. Reference photographs are not copied into the repository. Both media allowlists and the S3 initializer include the new files. Rerun minio-init and rebuild the frontends to update an existing environment.
