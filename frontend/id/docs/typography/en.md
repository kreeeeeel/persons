# Persons typography

All Persons interfaces use **Golos Text**, a variable font with Cyrillic and Latin coverage, weights 400–900. Both light and dark themes use the same family.

The font resources, OFL license and single `next/font/local` definition live in `frontend/assets`. The application re-exports `personsFont` as `uiFont` through `src/shared/theme/fonts.ts` and applies its CSS variable to the root HTML element. WOFF2 is served locally without external font requests.

`@persons/theme/typography.css` sets public Gravity UI tokens: body text, inputs, buttons and labels are at least 16px; heading weight is 600. Menus and dialogs inherit the same family through `.g-root`.

All three applications use the shared `@persons/theme/postcss` plugin. It places only Gravity UI CSS, including individually imported component styles, in the `gravity` layer. Application styles remain unlayered and retain priority regardless of production chunk order. The configuration preserves the standard Next.js PostCSS transforms. Do not use `!important` or duplicate global overrides to fix stylesheet ordering.

New applications should import `@persons/assets/fonts`, reuse the theme provider and configure `transpilePackages`. Do not duplicate font resources or loaders.

Verification covers Cyrillic glyphs, actual computed input typography, both themes, centered branding, language flag alignment and layouts at 320/375/768/1440px. Wait for `document.fonts.ready` before visual snapshots.
