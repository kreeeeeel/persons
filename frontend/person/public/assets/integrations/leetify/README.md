# Leetify / Counter-Strike assets

Assets retrieved on 2026-10-23 identify their providers, game maps and ranks. Their respective owners retain their artwork and trademark rights.

- Map logos are the original SVG files from `https://leetify.com/assets/images/map-icons/{map}.svg`; the unknown map uses `none.svg` from the same directory. These are map emblems, not gameplay screenshots.
- Competitive badges are from `https://leetify.com/assets/images/rank-icons/matchmaking{rank}.png`, for ranks 1–18.
- Wingman has its own emblems from `https://leetify.com/assets/images/rank-icons/matchmaking_wingman{rank}.png`, for ranks 1–18. They are stored separately from Competitive badges.
- The Leetify mark and unknown rank are from Leetify's published frontend assets.
- The Counter-Strike mark is from [Simple Icons](https://github.com/simple-icons/simple-icons/blob/develop/icons/counterstrike.svg), a CC0 collection; Valve retains trademark rights.

FACEIT level icons are unmodified PNG originals linked by the official [FACEIT CS2 Elo and skill levels article](https://support.faceit.com/hc/en-us/articles/10525200579740-FACEIT-CS2-Elo-and-skill-levels). The local `faceit-{level}.png` files use these source attachment URLs:

| Level | Original attachment |
| --- | --- |
| 1 | https://support.faceit.com/hc/article_attachments/10525200575516 |
| 2 | https://support.faceit.com/hc/article_attachments/10525189649308 |
| 3 | https://support.faceit.com/hc/article_attachments/10525200576796 |
| 4 | https://support.faceit.com/hc/article_attachments/10525185037724 |
| 5 | https://support.faceit.com/hc/article_attachments/10525215800860 |
| 6 | https://support.faceit.com/hc/article_attachments/10525245409692 |
| 7 | https://support.faceit.com/hc/article_attachments/10525185034012 |
| 8 | https://support.faceit.com/hc/article_attachments/10525189648796 |
| 9 | https://support.faceit.com/hc/article_attachments/10525200576028 |
| 10 | https://support.faceit.com/hc/article_attachments/10525189646876 |

Premier badges are rendered locally as SVG images from the historical numeric rating. The frame, tier colors and paired bars follow Leetify's published CS Rating component. `premierDigits.json` contains only glyph outlines and advance widths for digits, comma and hyphen from [Valve's Stratum2WebBold font](https://cdn.fastly.steamstatic.com/apps/csgo/fonts/Stratum2WebBold.woff2), referenced by [the official Counter-Strike site stylesheet](https://www.counter-strike.net/public/css/csgo_react/main.css). Valve retains the font and game artwork rights. The SVG embeds the glyph paths; it does not load a remote font.

The unmodified `attribution-light.png` and `attribution-dark.png` badges are the official small badges from the developer guidelines linked Google Drive folder (black/white variants). They are selected by theme and link to Leetify.

All components use local assets or inline SVG; they do not request images from a third-party host at runtime.
