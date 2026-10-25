# Games preview

Open http://localhost:3002/en/person/krel?preview=integrations. Games also exists without the query; other profiles show the integration-specific empty illustration. Use http://localhost:4310/feed-session?locale=en for a local test session and feed, or http://localhost:4310/session?locale=en for CMS.

Run scripts/start-community-preview.ps1. The mock API on 4310 serves four design fixtures through generated clients and the BFF. These are not real profile matches. Dialogs reuse match data, link to DotaBuff and restore focus on Escape. Tabs scroll horizontally; public properties update through SSE.

[Architecture, configuration, validation and live-parser limitations](../game-integrations/en.md).
