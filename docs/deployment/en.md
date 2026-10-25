# Deployment

See [object storage](storage_en.md) for external S3, object prefixes and cleanup.

See [the upgrade procedure](restrictions_en.md) for gateway/restrictions, Redis and legacy restriction migration.

The private [Те ещё люди group](https://gitlab.com/te-eshche-lyudi) contains individual backend, frontend and library projects. [Infrastructure](https://gitlab.com/te-eshche-lyudi/infrastructure) holds Docker, shared CI and deployment. Runtime secrets stay in the VDS `shared/.env`; SSH deployment settings are protected CI variables. Secrets are never committed.

Each component includes infrastructure's `ci/component.yml` and mirrors an integration pipeline with its exact commit through validated pipeline inputs. The resolve job selects all main revisions once, substitutes the triggering component SHA, and records `workspace.lock`, including infrastructure's commit. Every subsequent job checks out that same lock. `RELEASE_SHA` is the 40-character Git hash of the lock contents, so any component or infrastructure change produces its own image tag. The lock travels with the deployment bundle. Feature and merge request pipelines verify without publishing or deploying. Images live in infrastructure's registry; generated npm/Maven clients are not automatically published.

Infrastructure allows incoming job tokens from the group for downstream triggers and reading job artifacts. Components allow infrastructure's job token to read their source. The triggering user must also have project access. No persistent access token is needed.

Once credentials are configured, set the non-secret `DEPLOY_ENABLED=true` variable with scope `*` to enable the manual deploy job. Environment-scoped secrets are consumed only inside that job, never when evaluating pipeline rules.

The pipeline checks seven Kotlin projects, three Next.js applications and the `op` operator command. It builds production artifacts, publishes images tagged with the workspace fingerprint for main changes, and exposes a manual, serialized production deployment once deployment is explicitly enabled. Jobs use the project-scoped “Persons desktop Docker” runner tagged `persons-local` in the existing desktop runner container, with at most two concurrent jobs. Its Docker executor supports Docker-in-Docker with TLS through `/certs/client`; the PC and Docker must remain running during CI. Other registered runners are preserved.

MinIO and its client are built from pinned official source commits with Go 1.27.2 because the old vendor images are no longer downloadable. The server uses the upstream 2025-10-15 security release; licenses are included in the images. Production pulls the resulting server and asset images from this project's registry. Back up existing object-store volumes before upgrading; CI setup does not reinitialize local data.

Once hosting is agreed, prepare Docker Engine, Compose >=2.24.4, SSH and a deployment directory such as `/opt/persons`. Create `shared/.env` there manually with mode `0600`; use `.env.example` as the list of keys, replacing local defaults with actual secrets, SMTP settings and HTTPS URLs. The pipeline never creates or overwrites this file. Follow the [Nginx guide](nginx_en.md): the base domain uses loopback port 3002, `id.` uses 3000 and `cms.` uses 3001. Production Compose disables the local gateway and exposes Next.js directly on loopback. Set `SESSION_COOKIE_DOMAIN` to their common base domain; configuration rejects unrelated hosts or HTTP when sharing the HttpOnly session cookie.

Log the deployment user into `registry.gitlab.com` on the VDS with a read-only registry deploy token. In infrastructure add protected CI variables scoped to the `production` environment: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH` and optionally `DEPLOY_PORT` (22). Add file variables `DEPLOY_SSH_KEY` and `DEPLOY_KNOWN_HOSTS` with the same restrictions, verifying the host fingerprint independently. Verification jobs must not receive deployment credentials. Protect the default branch and production environment. Run the manual deployment after all checks and image publication succeed.

Deployment transfers configuration without runtime secrets, pulls immutable images and waits for health checks before updating `current`, preserving `previous`. PostgreSQL and S3 volumes remain persistent. Flyway changes are not automatically reversed: take backups and verify schema compatibility. Existing release directories are never overwritten; inspect a failed release before retrying the same SHA.

For an explicitly accepted 2 GB VDS deployment, prepare disk swap (for example, 4 GB) and write `small` to `/opt/persons/shared/resource-profile`. The optional `docker/compose.small.yaml` bounds JVM/Node heaps, container memory, PostgreSQL buffers and connection pools. Image pulls and service startup are sequential, waiting for each health check. The server-side selection survives releases; missing selection defaults to `standard`. Monitor container memory, swap, OOM counters and latency, especially during video processing and concurrent uploads. After a capacity upgrade, select `standard` for the next deployment. Persistent data volumes remain the same.

Install the requested operator command once:

```sh
sudo sh /opt/persons/current/scripts/install-op.sh /opt/persons
op friend@example.com
```

The caller needs Docker access. The command promotes an existing active account to `ADMIN` and revokes its sessions; the user must sign in again. Repeated promotion is idempotent. Missing or blocked accounts are rejected. Email is passed as a quoted psql variable inside a transaction with row locks. The installer refuses to replace another executable named `op`. `sh scripts/tests/op.test.sh` tests this using a separate disposable PostgreSQL container.

With `DEPLOY_TRANSFER_IMAGES=true`, CI and the VDS require Python 3.11 or newer. Delivery verifies the archive SHA-256 before loading, then compares the image configuration SHA-256 from a fresh target export. Configuration includes the uncompressed layer digests. This content identity works across classic and containerd stores, unlike Docker's `.Id`. Transfer tests cover both archive layouts, ambiguous manifests, corrupted transfers and configuration mismatches.

Yandex ID already implements Authorization Code, S256 PKCE, browser binding and single-use state. Existing email addresses are never silently linked. Live authorization still requires app credentials and a registered HTTPS callback; configure these later on the server only. See the [Russian deployment guide](ru.md) for full operational details.
