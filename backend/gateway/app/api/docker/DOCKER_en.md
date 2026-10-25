# Gateway

From the infrastructure root: `docker compose build gateway`, then `docker compose up -d gateway`. Port 8087, `/actuator/health`. Requires ID, Person and Restrictions. See [configuration](../../../docs/gateway/en.md). Compose supplies internal destinations and secrets, starts dependencies first and routes BFFs through the gateway.

The image runs as UID 10001. Prebuilt JARs are supported by the shared `docker/compose.prebuilt.yaml`. No file storage, database, volumes or publicly exposed production port are required.
