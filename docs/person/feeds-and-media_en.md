# Feeds and media links

Photos allow 32 MiB, videos 512 MiB, and multipart requests 545 MiB. Both frontends expose `/api/person/v1/persons/{id}/media` through a native Node API handler with `bodyParser: false`, forwarding the stream with backpressure instead of adapting it to a Web Request or FormData. Origin, session, UUID and size checks remain in place; the backend validates permissions, restrictions and file contents. Client cookies are not forwarded. All other pages and APIs remain in the App Router. Uploads time out after ten minutes and nginx does not buffer request bodies.

S3 `PutObject` requests have a separate five-minute upload timeout. Reads and deletes retain the client's short default. This prevents large uploads on a small VDS from failing ten seconds into storage transfer. A regression test exercises the real HTTP client against a delayed storage response.

Public and CMS lists share `useInfinitePersonData` and `InfiniteFeedLoader`. Approaching the end appends the next batch and displays the rotating brand logo. Existing entries survive loading and next-page failures. Retry requests the failed page; changing search or filters cancels stale requests and starts at page zero. Manual page switching is removed. A load-more button is retained only as an accessible fallback when IntersectionObserver is unavailable.

Photo links use `/{tag}?photo={mediaUuid}`; moment links use `/{tag}?video={mediaUuid}`. Share copies the public-domain link, including from CMS. Arriving opens the profile, correct tab and viewer independently of the grid page. The viewer validates the profile and collection; the backend still enforces access to unpublished media. Pending media has no public share button.

Opening a gallery pushes one browser-history entry. Viewer arrows replace it; Back closes and Forward reopens. Closing a direct link removes media parameters without leaving the profile. Other parameters remain. Invalid UUIDs and ambiguous parameters are ignored.

`LoadedImage` listens to the rendered image instead of preloading its URL with a separate `new Image()`. Achievement catalog images load lazily. React `cache` deduplicates current-user lookups within a server render only, never across requests or accounts.

Run `npm run check` in `frontend/person`, `frontend/person-admin`, and `frontend/id`. Tests cover appended batches, search reset, retry, no manual pager, sharing/history, profile/collection validation, moderation, and image loading.
