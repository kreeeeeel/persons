# Account settings and personal entries

The account menu's Settings item opens a compact dialog with Account (Profile and Avatar), Application (Interface and Player), and Privacy (Email, Password, Sessions and Restrictions) groups. The layout and selection rows follow Aigram: labels on the left, radio buttons on the right. Desktop dimensions are limited to 800 × 640 px; mobile navigation uses a selector at the top.

Profile settings edit the first name, last name and optional middle name. Authenticated `PUT /account/v1/profile` trims surrounding whitespace and validates a maximum of 80 characters per field. Avatar selection and cropping are embedded in Avatar without another dialog. The existing person-page editor dialog remains available.

Password changes and verified email changes have individual entries in Privacy. Restrictions show blocked actions, their reason and expiry, with an option to refresh. Device information and individual or bulk session revocation are embedded in Sessions without another dialog.

Theme and language reuse existing preferences and cookies. Theme customization is unavailable. Autoplay, muted startup, quality, speed and default volume (50%) are saved automatically in this browser. When the selected quality is unavailable, the player chooses the nearest available resolution, preferring a lower resolution. Browser permissions may prevent autoplay.

A saved review replaces its composer and is excluded from the public feed for its author. Editing opens a draft; Save submits the text, emoji and score together. Cancel preserves the saved review. A trash icon at the bottom right removes the rating.

The wall and loan feeds' Mine filter sends `mine=true`. The server requires authentication and filters before pagination, including that user's pending entries. Editing replaces the selected card; failures retain the draft. Moderation rules remain unchanged.

Player quality and speed selectors use a compact 180 px width. Name fields remain full width. Session client/OS and network/sign-in details have tighter spacing; the external geolocation attribution is hidden.

Administrators can open Users → Actions → Sessions and IP to view sign-in IPs, browser/OS, application and creation/last-activity times for the selected account's active sessions. Expired and revoked sessions are excluded. `GET /v1/admin/users/{id}/sessions` routes through the gateway to ID, with administrator checks in both services and no response caching. Tokens and token hashes are never returned. Bulk session revocation remains a separate action.

User actions include Edit name for administrators. All three fields are loaded from ID; first and last names are required and the middle name can be cleared. Names are trimmed and limited to 80 characters. Updating a name does not change access, email or active sessions. The browser uses `PUT /api/person/v1/admin/users/{id}/profile`, with repeated administrator checks in the gateway and ID.

Avatar save/cancel buttons form a centered vertical stack. Settings scrollbars appear on hover or focus; touch devices show them when content overflows. Scrollbar arrows are hidden, and the left menu does not scroll at the normal dialog height.
