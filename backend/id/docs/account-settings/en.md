# Account settings and S3

POST /account/v1/email requires a new email, current password and locale. Its CHANGE_EMAIL challenge is bound to the authenticated user. Verify the OTP through challenge/verify, then submit its one-time grant to POST /account/v1/email/complete. Owner, purpose, expiry and target email are checked. Availability is rechecked with an account lock; conflicts roll back grant consumption. Other sessions are revoked.

PUT /account/v1/password verifies the current password using existing rate limits, validates the new password (10 characters minimum, 72 UTF-8 bytes maximum), then locks/rechecks before updating its hash. The current session survives; other sessions are revoked. Secrets are masked in logs.

DELETE /v1/sessions/others affects only other sessions of the authenticated user. A session region is accepted only with a trusted service JWT. Without a GeoIP gateway it remains unknown.

id accesses S3 directly through AWS SDK, including VK Cloud. Configure the ignored app/api/docker/.env. Existing object keys are preserved. Pending normalized JPEGs are durably retained until upload succeeds, then replaced by their private object key. Failures retry after one minute. Avatar reads require a user JWT.

PUT /account/v1/avatar accepts the current user's avatarBase64: a 384×384 JPEG up to 300 KB. Validation precedes a locked account update. The new image enters the existing durable upload queue and clears the previous object key; reads immediately use the pending bytes. AvatarTransferJob uploads with retries. Invalid images return INVALID_AVATAR without changing the old avatar. Base64 is masked in logs; no schema migration is required.

Supply emailChangeSubject/emailChangeTitle/emailChangeText in the mail namespace through the i18n API, alongside existing shared mail strings. Translation content is never stored in migrations.
