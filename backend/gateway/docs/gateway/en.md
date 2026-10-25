# Gateway

Next.js BFFs use the gateway's `/id` and `/person` prefixes. The gateway uses fixed internal ID, Person and Restrictions destinations; callers cannot select a destination URL. A shared internal JWT is required. Identity comes from the ID session rather than caller-provided identity headers.

Before invoking Person, the gateway checks the full ACCOUNT ban and operation scope: COMMENTS, RATINGS, LOANS, MEDIA, PROFILE or REACTIONS. A contract test covers every Person mutation; unknown mutations are denied. Reads also check full bans. Restriction explanations, own identity/avatar, session listing, session renewal and logout remain available. Internal ID administration is never proxied. Failed policy checks return 503 rather than permitting access.

Person retains authentication and ownership checks but no longer owns restrictions. A separate short-lived `X-Gateway-Authorization` JWT for audience `persons-person` proves gateway traversal and replaces any incoming header. Direct Person requests without this signature are rejected before multipart parsing. Only Person and the gateway receive `PROJECT_GATEWAY_JWT_SECRET`.

Legacy Person account administration contracts remain compatible. Account reads and session revocation go to ID; role/restriction changes go to Restrictions for coordination. Mutations are never automatically retried.

CMS retrieves account avatars through `GET /person/v1/admin/users/{id}/avatar`. The gateway verifies the session and administrator role before calling the internal ID API with its service signature. JPEG responses use `private, no-store` and `nosniff`; missing avatars retain 404 for the initials fallback. BFF requests to `/id/internal/**` remain prohibited.

Uploads and responses stream without buffering entire bodies. Range/206, Content-Range and response lengths are preserved. Gateway multipart parsing is disabled; the request timeout is ten minutes. Client IP metadata follows the existing trusted Nginx → BFF → gateway → service chain. Ambiguous paths are rejected.

`GET /{person|id}/v1/dynamic-properties/events` uses Spring MVC async without holding an HTTP request thread. SSE bytes and heartbeats are forwarded unchanged and flushed immediately; the next upstream batch is requested only after the current batch is sent. Client disconnects, errors and stream completion cancel the upstream subscription. Connections end after ten minutes so EventSource reconnects with a fresh settings snapshot. Access checks and service signing remain identical to regular requests.

Configuration: `PROJECT_INTERNAL_JWT_SECRET`, `PROJECT_GATEWAY_JWT_SECRET`, `ID_BASE_URL`, `PERSON_BASE_URL`, `RESTRICTIONS_BASE_URL`. Profiles: dev/testing/production/tests. No gateway database. See [Person OpenAPI](../../../person/app/contract/api/schema/api.yaml) and [Restrictions OpenAPI](../../../restrictions/app/contract/api/schema/api.yaml).
