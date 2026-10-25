# Yandex Metrica

The main site, ID and CMS share counter **113741427** through `@persons/ui/analytics/YandexMetrika` in their root layouts. No additional dependencies or environment variables are required.

Analytics runs only with `APP_ENV=prod`, HTTPS and a current origin matching `PUBLIC_URL`. Localhost, IP addresses and the `dev`/`testing` profiles never load the script, including local production Compose deployments.

The script loads after hydration and only with `PERSONS_OPTIONAL_COOKIES=accepted`. The existing main-site banner saves this preference on `SESSION_COOKIE_DOMAIN`, sharing the choice with ID/CMS. Direct ID/CMS visits without a choice remain untracked; consent can be given on the main site. Refusal stops the counter using `destruct`; renewed consent starts it again. Other application tabs recheck consent when focused.

Initialization uses `defer: true`. The initial page and Next.js navigation explicitly call `hit`, preventing a duplicate automatic initial view. Renders, excluded query changes and fragments do not create views. The previous page becomes the referer. URLs retain only `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `yclid`, `ysclid`, `gclid`; other query parameters, credentials and fragments are removed. A fixed page title avoids including profile data.

Session Replay, click maps, automatic outbound-link tracking, hash tracking and Yandex Tag Manager are disabled. Business events and conversion goals are not configured yet. Script failure does not block the application. There is no noscript pixel because it would bypass cookie preferences.

Configure the counter with the main domain, `id.` and `cms.`, address filtering and subdomain inclusion. After releasing all three frontend images, accept cookies and navigate across pages and applications, then verify the counter in Metrica. Do not include real tokens or personal information in campaign tags. Refusal must stop new events. Local tests mock the SDK and never send visits to the production counter.

Checks: run `npm test -- tests/yandexMetrika.test.tsx tests/cookiePreferencesRoute.test.ts src/shared/ui/CookieNotice/CookieNotice.test.tsx` in `frontend/person`, plus typecheck, lint and production builds for all three applications.

References: [SPA setup](https://yandex.ru/support/metrica/ru/code/counter-spa-setup), [initialization](https://yandex.ru/support/metrica/ru/code/counter-initialize), [hit](https://yandex.ru/support/metrica/ru/objects/hit), [privacy](https://yandex.ru/support/metrica/ru/general/confidential-data).
