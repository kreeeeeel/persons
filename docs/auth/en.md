# Authentication

Sign-in and recovery use a centered transparent column containing the logo, localized heading and form. Sign-in places a divider and the Yandex ID button after the primary actions. Authentication screens have no side illustration, header, footer, language picker or theme picker. The URL selects the locale, the shared application preference selects the theme, and all text is at least 16px.

Registration collects details, confirms a six-digit email challenge, sets a password and optional avatar, then issues a session. Account creation happens after email verification. Recovery uses a separate challenge and revokes prior sessions. Account email/password changes are available through the API; a settings screen is outside this stage.

Passwords have at least 10 characters and at most 72 UTF-8 bytes and use BCrypt cost 12. Sessions are signed JWTs backed by hashed, revocable PostgreSQL records with a 30-day lifetime. `PERSONS_SESSION` is HttpOnly, SameSite=Lax and Secure on HTTPS public URLs. Service JWTs stay server-side. Server Actions validate input and preserve Next origin checks; backend validation and authorization remain independent.

Email codes are HMAC-hashed with a pepper, expire in ten minutes and allow five attempts; resend cooldown is 60 seconds. IP/account limits protect password sign-in; five wrong passwords lock the account for 15 minutes. Persistent outboxes retry delivery. Secrets, OAuth proofs and codes are redacted from logs.

OAuth providers implement `oauth/OAuthProvider`; Yandex lives in `oauth/impl`. State is single-use, expires after ten minutes and is bound to an HttpOnly browser cookie. State and binding are stored as hashes. Provider HTTP requests do not hold database transactions. Provider tokens are neither persisted nor returned to the browser. An existing matching email never causes automatic account linking.

Stored roles are USER/ADMIN and account states ACTIVE/BLOCKED. The separate admin gateway calls ID, which checks current role and session on every request. Access changes revoke all sessions. Administrator rows are locked in stable order to protect the final active administrator. Bootstrap only promotes an existing verified account matching the configured email.

Contracts: [ID](../../backend/id/app/contract/api/schema/api.yaml), [Admin](../../backend/person/app/contract/api/schema/api.yaml). Swagger is enabled in dev/testing and disabled in production. Tests cover registration, verification, recovery, sessions, access, blocking and OAuth replay/binding/expiry/conflicts. Live Yandex sign-in requires your application credentials.
