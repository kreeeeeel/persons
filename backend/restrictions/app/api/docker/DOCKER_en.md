# Restrictions API

From the infrastructure root: `docker compose build restrictions`, then `docker compose up -d restrictions`. Port 8088, `/actuator/health`. Requires a dedicated PostgreSQL database `restrictions`, Redis and ID. See [configuration and rules](../../../docs/restrictions/en.md).

Fresh volumes initialize the database automatically. Upgrade existing environments using the infrastructure migration procedure to preserve legacy restrictions; do not delete PostgreSQL volumes. Images run as UID 10001 and receive secrets through environment variables. Prebuilt JARs are supported by the shared `docker/compose.prebuilt.yaml`.
