# Gateway

Kotlin/Spring MVC gateway on port 8087. Fixed `/id/**` and `/person/**` upstreams, account restriction checks and streaming request/response forwarding. Reuses ID, Person and Restrictions contracts; does not introduce a duplicate API specification. No database or Redis access.

Run `./gradlew build ktlintCheck`. Tests exercise real HTTP proxying, chunked uploads, byte ranges, authentication, scoped restrictions and route-policy coverage against the Person contract. See [Russian documentation](docs/gateway/ru.md), [English documentation](docs/gateway/en.md) and [Docker](app/api/docker/DOCKER_en.md).
