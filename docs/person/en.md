# person landing page

`frontend/person` is a separate Next.js/Gravity UI application at `http://localhost:3002/ru` or `/en`. It shares Golos Text, themes, i18n, assets and generated API clients. Search uses backend/person after a 350 ms typing pause and opens clean persona URLs. See the [domain guide](domain_en.md).

The page occupies `100dvh` without document scrolling. The transparent header overlays the illustration, so there is no separate colored strip above the canvas. Portrait layouts place the illustrations below the copy to preserve faces. The large heading types into two explicit lines without extra wrapping; its font size follows the content width. Eight scenes crossfade every nine seconds. Transparent controls are centered at the bottom: pause/resume on the left, followed by scene dots, with no arrows. Focusing search changes the icon color without adding a border. Input focus, an inactive browser tab and `prefers-reduced-motion` stop automatic movement. Loading states cover the page, account, heading and artwork.

The anonymous header links to ID with `returnTo=/person/{locale}`. Password sign-in, registration, recovery and OAuth preserve the destination. ID accepts only fixed local paths and redirects its `/person/{locale}` handoff to the configured `PERSON_PUBLIC_URL`; arbitrary external redirect URLs are rejected. Direct ID sign-in still defaults to the ID profile.

The active dot fills purple over nine seconds. Both the fill and countdown retain the remaining time while paused, search is focused or the tab is hidden; each new scene restarts its fill. Timing starts once the image is loaded. Reduced-motion users see a static indicator. CSS handles animation without updating React on every frame.

The authenticated header loads a minimal user DTO server-side. The avatar proxy is private and uncached; the JWT stays in an HttpOnly cookie. The profile link opens the verified persona or personal page request; sessions and notifications open modal dialogs on the current page. Sign-out revokes only the current session before clearing the cookie; failures preserve the cookie and show a retryable error.

The shared gateway exposes ID on 3000, admin on 3001 and person on 3002. Next containers have no host port bindings. The gateway overwrites `X-Forwarded-For` with the connection IP; trusted BFFs forward it with a service JWT. Keep `TRUST_PROXY=false` when running Next directly. Session records include IP, User-Agent, OS/version, browser, device, application, creation and last-activity timestamps. GeoIP is not configured, so region stays empty.

Use the same hostname for all local applications (`localhost` across all ports). The production base domain, `id.` and `cms.` share a Secure HttpOnly session through `SESSION_COOKIE_DOMAIN`; configuration validates HTTPS and common domain membership. See the [Nginx guide](../deployment/nginx_en.md).

Checks: `npm ci`, `npm run check`, `npm run build:prod`, then `npm run test:e2e` against Compose. The opt-in `E2E_LIVE_STACK=true` test requires local Mailpit SMTP. Do not run it against external SMTP because its fixture addresses use `example.test`.

The person domain, moderated profiles, clean tag URLs, custom player, modal sessions and seeded examples are described in [the domain guide](domain_en.md).

[Community interactions, loans and personal pages](community_en.md).

The loaded home page and person profiles include a neutral, borderless glass ticker fixed to the bottom: “All characters are fictional; any resemblance is coincidental • This site uses AI-generated content”. Loading, 404, error, blocked and other utility pages do not mount it. Both ru and en are supported. The first switch under Settings → Interface, “Hide the scrolling ticker”, saves the personal preference in this browser. Slideshow controls and profile content account for the measured strip height; reduced motion shows stationary, wrapping text. The shared component lives in `@persons/ui`; ID and CMS do not mount it.

CMS → Management → Site interface lets administrators disable the ticker for all visitors. It defaults to enabled; changes are persisted in `site_settings` (Flyway V18), including who updated it and when, and take effect on page opening or refresh. Uncached `GET /v1/site-settings` exposes the public flag; reading or updating `/v1/admin/site-settings` requires an administrator. If settings are unavailable, primary content remains accessible, the ticker stays hidden and the error is logged without sensitive data.
