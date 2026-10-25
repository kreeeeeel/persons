# Object storage

ID and person use separate PostgreSQL databases, `id` and `person`. S3 stores
files; databases contain their keys and metadata. API/BFF avatar and media URLs
preserve authorization and visibility when changing storage providers.

| Prefix | Contents |
| --- | --- |
| `achievments/` | Achievement images, using the requested directory spelling |
| `video/` | Moments, previews and quality variants |
| `photo/` | Photographs |
| `avatars/` | Account and person avatars |
| `proofs/` | Private ownership evidence |
| `assets/` | Public site illustrations, logos and icons |

Only `assets/*` permits anonymous reads. Never expose the whole bucket or its
credentials. Other files are served through the authorized API.
Originals and previews are siblings (`.../original` and `.../preview`), so an
original object key is never also the parent prefix of another object.

Local development uses MinIO. Add `-f docker/compose.external-s3.yaml` after the
production Compose file for external storage. Configure `S3_ENDPOINT`,
`S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, and `ASSET_BASE_URL`
(the assets directory URL) in the protected server `.env`. Set
`/opt/persons/shared/storage-profile` to `external` for CI/CD. The default is
`local`. External deployments skip the MinIO server and retain its volume.

The asset initializer supports both modes and scopes its public policy to
`assets/*` in the chosen bucket. Copy files and verify checksums and access
first. Stop writers for the final sync before updating database keys and env.
Preserve source objects and backups until validation completes. Object-key
migration is an operational data change; Flyway contains schema changes only.

`person-worker` deletes approved photo/video removals, previews and quality
variants. Deleting an achievement hides it and retires its image; setting
`active=false` preserves the image for reactivation. Replacing an image retires
the old object. Cleanup runs every minute and retains failed deletions for
retry. Unattached uploads remain protected for 24 hours. ID overwrites the
account's permanent avatar key; old versions do not accumulate when bucket
versioning is disabled.

`scripts/tests/storage.test.sh SERVER_IMAGE ASSETS_IMAGE` checks both modes
and object privacy. `node --test ci/tests/external-s3.test.mjs` checks external
configuration and distinct database URLs.
