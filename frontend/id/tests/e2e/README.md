# Browser checks

Run against the local Compose stack only:

```powershell
$env:E2E_BASE_URL='http://localhost:3000'
$env:PLAYWRIGHT_CHANNEL='chrome'
$env:E2E_LIVE_STACK='true'
npm run test:e2e
```

The live test registers a new `@example.test` account, reads its verification message from local Mailpit, uploads a cropped avatar, checks the authenticated profile and revokes the session. It does not replace translation catalogs or send external email.
