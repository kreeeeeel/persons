# Content reactions and feed sorting

Wall comments, reviews, loans and photo/video comments support mutually exclusive likes and dislikes. Choosing the other reaction replaces the current one; clicking the selected reaction clears it. Anonymous visitors can read counts. The REACTIONS restriction covers both actions, and unpublished content remains protected.

Migration V7 preserves existing `content_likes` as LIKE reactions and retains uniqueness by target kind, target ID and account. An index supports reaction counts and ordering. PUT `/v1/content/{kind}/{id}/reaction` accepts `{"reaction":"LIKE"}` or `{"reaction":"DISLIKE"}`. DELETE clears the current reaction. Responses retain `count` and `liked` and add `dislikes` and `disliked`. Legacy `/like` routes remain supported; legacy DELETE removes only a like.

The comments, ratings and credit list endpoints accept `sort=NEWEST|OLDEST|MOST_LIKED|MOST_DISLIKED`, defaulting to NEWEST. Ordering applies to all visible rows before pagination. Equal reaction counts use creation time descending, then ID. Feed items include both counts and the current account's selection. Shared UI components serve the public site and CMS, reset pagination when sorting changes and cancel obsolete requests. Photo/video reaction counts stay transparent on hover and still open the voter lists.

Numeric ratings and reputation are still calculated by person-worker. Reactions on content do not alter the reputation formula, which uses numeric ratings and approved loan reports.

Hovering a numeric count opens a voter dropdown; the separate icon changes the reaction. Comments, reviews, loans, photos, videos and CMS share this component without a reaction modal. A short close delay bridges the gap between the counter and popup so visitors can scroll and follow links. Keyboard focus also opens it, Escape dismisses it, and touch activation remains available. GET `/v1/content/{kind}/{id}/reactions?reaction=LIKE&page=0&size=12` returns the same ReactionAuthorPage used by media, also accepting DISLIKE. Publicly visible content supports anonymous reads, ordered by reaction time and ID descending. Page size is 1–50 and page number 0–10000. Scrolling loads more voters; failures retain loaded rows and offer retry. Linked accounts show avatars and public profile links, including from CMS. Accounts without a person page have no invented link.

V8 adds a reaction author name snapshot, backfills names from linked persons and indexes voter pagination. New votes capture the ID display name; profile/avatars are batch loaded without N+1 queries. Unavailable and pending content never disclose voter lists.

Run the person backend's ktlintCheck, API tests and bootJar, then `npm run check` and `npm run build` in both frontends. Local browser tests in person-polish.spec.ts create and clean up temporary data without sending email.
