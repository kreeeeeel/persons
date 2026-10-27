import "server-only";

import {
    CommentInputFromJSON,
    ContentHideInputFromJSON,
    PageRestrictionInputFromJSON,
    ContentReactionInputFromJSON,
    Configuration,
    UserProfileUpdateFromJSON,
    CreditInputFromJSON,
    DecisionInputFromJSON,
    OwnerLinkInputFromJSON,
    ProfileInputFromJSON,
    TagDefinitionFromJSON,
    RatingInputFromJSON,
    ResponseError,
    MediaEditInputFromJSON,
    MediaReactionInputFromJSON,
    AchievementInputFromJSON,
    AchievementTypeFromJSON,
    AchievementGrantInputFromJSON,
    RestrictionInputFromJSON,
    PublicationSettingsFromJSON,
    SiteSettingsFromJSON,
    UserModerationSettingsFromJSON,
    ReputationOverrideInputFromJSON,
} from "@persons/person-client";
import type {
    AdminContentKind,
    AdminContentStatus,
    AdminContentOrder,
    ModerationFilterStatus,
    ModerationContentType,
    ModerationOrder,
    ContentKind,
    FeedSort,
    PublicationKind,
    DirectoryOrder,
    CommunityFeedFilter,
} from "@persons/person-client";
import { createPersonClients } from "@persons/person-domain/api/clients";
import type { BffConfiguration } from "@persons/person-domain/api/server.types";

const VISITOR_COOKIE = "PERSONS_VISITOR";
const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQUEST_TIMEOUT_MS = 15000;
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;

export function serverPersonClients(config: BffConfiguration) {
    return createPersonClients(
        new Configuration({
            basePath: config.personUrl,
            accessToken: config.sessionToken,
            headers: {
                "X-Service-Authorization": `Bearer ${config.serviceToken}`,
                ...(config.sessionToken
                    ? { Authorization: `Bearer ${config.sessionToken}` }
                    : {}),
            },
            fetchApi: (input, init) =>
                fetch(input, {
                    ...init,
                    cache: "no-store",
                    signal:
                        init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                }),
        }),
    );
}

export async function handlePersonRequest(
    request: Request,
    parts: readonly string[],
    config: BffConfiguration,
) {
    const modifying = !["GET", "HEAD"].includes(request.method);

    if (
        modifying &&
        request.headers.get("origin") !== new URL(config.publicUrl).origin
    ) {
        return Response.json({ code: "FORBIDDEN" }, { status: 403 });
    }

    const api = serverPersonClients(config);
    const url = new URL(request.url);
    const routePath = parts
        .map((part, index) => {
            if (
                index === 3 &&
                ((parts[1] === "authors" && parts[2] === "by-handle") ||
                    (parts[1] === "publications" && parts[2] === "by-author"))
            ) {
                return "{handle}";
            }
            if (
                parts[1] === "persons" &&
                parts[3] === "games" &&
                parts[4] === "dota2" &&
                parts[5] === "matches" &&
                index === 6 &&
                /^[1-9][0-9]{0,18}$/.test(part)
            ) {
                return "{id}";
            }
            if (UUID_PATTERN.test(part)) {
                return "{id}";
            }
            if (
                (parts[1] === "content" && index === 2) ||
                (parts[1] === "admin" && parts[2] === "content" && index === 3)
            ) {
                return "{kind}";
            }
            if (
                parts[1] === "media" &&
                parts[3] === "qualities" &&
                index === 4
            ) {
                return "{height}";
            }
            return part;
        })
        .join("/");
    const route = `${request.method} ${routePath}`;
    const id = parts[2];
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 12);
    const sort = (url.searchParams.get("sort") ?? "NEWEST") as FeedSort;
    let visitor: string | undefined;

    try {
        let response: { raw: Response };

        if (
            request.method === "GET" &&
            parts.length === 4 &&
            parts[0] === "v1" &&
            parts[1] === "persons" &&
            parts[2] === "by-tag"
        ) {
            response = await api.persons.getPersonRaw({ tag: parts[3] });
        } else {
            switch (route) {
                case "GET v1/authors/me":
                    response = await api.publications.getMyPublicAuthorRaw();
                    break;
                case "GET v1/authors/by-handle/{handle}":
                    response = await api.publications.getPublicAuthorRaw({
                        handle: parts[3],
                    });
                    break;
                case "GET v1/publications/by-author/{handle}":
                    response = await api.publications.listAuthorPublicationsRaw(
                        {
                            handle: parts[3],
                            page,
                            size,
                            kind: (url.searchParams.get("kind") ??
                                undefined) as PublicationKind | undefined,
                        },
                    );
                    break;
                case "GET v1/tag-definitions":
                    response = await api.tags.listTagDefinitionsRaw();
                    break;
                case "PUT v1/admin/tag-definitions":
                    response = await api.tags.updateTagDefinitionsRaw({
                        tagDefinition: (await request.json()).map(
                            TagDefinitionFromJSON,
                        ),
                    });
                    break;
                case "GET v1/authors/{id}/avatar":
                    response = await api.authors.getAuthorAvatarRaw({ id });
                    break;
                case "GET v1/admin/users/{id}/page-restrictions":
                    response =
                        await api.pageRestrictions.listPageRestrictionsRaw({
                            id: parts[3],
                        });
                    break;
                case "PUT v1/admin/users/{id}/page-restrictions":
                    response = await api.pageRestrictions.setPageRestrictionRaw(
                        {
                            id: parts[3],
                            pageRestrictionInput: PageRestrictionInputFromJSON(
                                await request.json(),
                            ),
                        },
                    );
                    break;
                case "DELETE v1/admin/users/{id}/page-restrictions/{id}":
                    response =
                        await api.pageRestrictions.revokePageRestrictionRaw({
                            id: parts[3],
                            restrictionId: parts[5],
                        });
                    break;
                case "GET v1/admin/blocked-users":
                    response = await api.restrictions.listBlockedUsersRaw({
                        page,
                        size,
                        q: url.searchParams.get("q") ?? undefined,
                        userId: url.searchParams.get("userId") ?? undefined,
                    });
                    break;
                case "GET v1/admin/page-restrictions":
                    response =
                        await api.pageRestrictions.listActivePageRestrictionsRaw(
                            {
                                page,
                                size,
                                q: url.searchParams.get("q") ?? undefined,
                                userId:
                                    url.searchParams.get("userId") ?? undefined,
                            },
                        );
                    break;
                case "GET v1/admin/users":
                    response = await api.accounts.listAdminUsersRaw({
                        page,
                        size,
                        search: url.searchParams.get("search") ?? undefined,
                    });
                    break;
                case "PUT v1/admin/users/{id}/profile":
                    response = await api.accounts.updateUserProfileRaw({
                        id: parts[3],
                        userProfileUpdate: UserProfileUpdateFromJSON(
                            await request.json(),
                        ),
                    });
                    break;
                case "GET v1/admin/users/{id}/sessions":
                    response = await api.accounts.listUserSessionsRaw({
                        id: parts[3],
                    });
                    break;
                case "GET v1/site-settings":
                    response = await api.siteSettings.getSiteSettingsRaw();
                    break;
                case "GET v1/admin/site-settings":
                    response = await api.siteSettings.getAdminSiteSettingsRaw();
                    break;
                case "PUT v1/admin/site-settings":
                    response = await api.siteSettings.updateSiteSettingsRaw({
                        siteSettings: SiteSettingsFromJSON(
                            await request.json(),
                        ),
                    });
                    break;
                case "GET v1/admin/publication-settings":
                    response =
                        await api.publication.getPublicationSettingsRaw();
                    break;
                case "PUT v1/admin/publication-settings":
                    response =
                        await api.publication.updatePublicationSettingsRaw({
                            publicationSettings: PublicationSettingsFromJSON(
                                await request.json(),
                            ),
                        });
                    break;
                case "GET v1/admin/users/{id}/moderation-settings":
                    response =
                        await api.publication.getUserModerationSettingsRaw({
                            id: parts[3],
                        });
                    break;
                case "PUT v1/admin/users/{id}/moderation-settings":
                    response =
                        await api.publication.updateUserModerationSettingsRaw({
                            id: parts[3],
                            userModerationSettings:
                                UserModerationSettingsFromJSON(
                                    await request.json(),
                                ),
                        });
                    break;
                case "GET v1/access":
                    response = await api.restrictions.getAccessStateRaw();
                    break;
                case "GET v1/admin/users/{id}/restriction":
                    response = await api.restrictions.getUserRestrictionRaw({
                        id: parts[3],
                    });
                    break;
                case "PUT v1/admin/users/{id}/restriction":
                    response = await api.restrictions.setUserRestrictionRaw({
                        id: parts[3],
                        restrictionInput: RestrictionInputFromJSON(
                            await request.json(),
                        ),
                    });
                    break;
                case "DELETE v1/admin/users/{id}/restriction":
                    response = await api.restrictions.revokeUserRestrictionRaw({
                        id: parts[3],
                    });
                    break;
                case "GET v1/content/{kind}/{id}/like":
                    response = await api.engagement.getContentLikeRaw({
                        id: parts[3],
                        kind: parts[2] as ContentKind,
                    });
                    break;
                case "PUT v1/content/{kind}/{id}/like":
                    response = await api.engagement.likeContentRaw({
                        id: parts[3],
                        kind: parts[2] as ContentKind,
                    });
                    break;
                case "DELETE v1/content/{kind}/{id}/like":
                    response = await api.engagement.unlikeContentRaw({
                        id: parts[3],
                        kind: parts[2] as ContentKind,
                    });
                    break;
                case "PUT v1/content/{kind}/{id}/reaction":
                    response = await api.engagement.reactToContentRaw({
                        id: parts[3],
                        kind: parts[2] as ContentKind,
                        contentReactionInput: ContentReactionInputFromJSON(
                            await request.json(),
                        ),
                    });
                    break;
                case "DELETE v1/content/{kind}/{id}/reaction":
                    response = await api.engagement.clearContentReactionRaw({
                        id: parts[3],
                        kind: parts[2] as ContentKind,
                    });
                    break;
                case "GET v1/persons/directory":
                    response = await api.persons.listDirectoryRaw({
                        page,
                        size,
                        order: (url.searchParams.get("order") ??
                            "VIEWS") as DirectoryOrder,
                    });
                    break;
                case "GET v1/persons/search":
                    response = await api.persons.searchPersonsRaw({
                        q: url.searchParams.get("q") ?? "",
                        page,
                        size,
                    });
                    break;
                case "POST v1/persons":
                    response = await api.persons.createPersonRaw({
                        profileInput: ProfileInputFromJSON(
                            await request.json(),
                        ),
                    });
                    break;
                case "GET v1/persons/mine":
                    response = await api.persons.getMyPersonRaw();
                    break;
                case "POST v1/persons/mine":
                    response = await api.persons.requestMyPersonRaw({
                        profileInput: ProfileInputFromJSON(
                            await request.json(),
                        ),
                    });
                    break;
                case "PUT v1/persons/{id}":
                    response = await api.persons.updatePersonRaw({
                        id,
                        profileInput: ProfileInputFromJSON(
                            await request.json(),
                        ),
                    });
                    break;
                case "DELETE v1/persons/{id}":
                    response = await api.persons.deletePersonRaw({ id });
                    break;
                case "GET v1/persons/{id}/comments":
                    response = await api.interactions.listCommentsRaw({
                        id,
                        page,
                        size,
                        momentId: url.searchParams.get("momentId") ?? undefined,
                        mediaId: url.searchParams.get("mediaId") ?? undefined,
                        sort,
                    });
                    break;
                case "POST v1/persons/{id}/comments":
                    response = await api.interactions.createCommentRaw({
                        id,
                        commentInput: CommentInputFromJSON(
                            await request.json(),
                        ),
                    });
                    break;
                case "DELETE v1/comments/{id}":
                    response = await api.interactions.deleteCommentRaw({ id });
                    break;
                case "PUT v1/comments/{id}":
                    response = await api.interactions.editCommentRaw({
                        id,
                        commentInput: CommentInputFromJSON(
                            await request.json(),
                        ),
                    });
                    break;
                case "PUT v1/credit/{id}":
                    response = await api.interactions.editCreditRaw({
                        id,
                        creditInput: CreditInputFromJSON(await request.json()),
                    });
                    break;
                case "GET v1/persons/{id}/rating":
                    response = await api.interactions.getRatingRaw({ id });
                    break;
                case "GET v1/persons/{id}/ratings":
                    response = await api.interactions.listRatingsRaw({
                        id,
                        page,
                        size,
                        sort,
                    });
                    break;
                case "PUT v1/persons/{id}/rating":
                    response = await api.interactions.ratePersonRaw({
                        id,
                        ratingInput: RatingInputFromJSON(await request.json()),
                    });
                    break;
                case "DELETE v1/persons/{id}/rating":
                    response = await api.interactions.removeRatingRaw({ id });
                    break;
                case "GET v1/persons/{id}/moments":
                    response = await api.persons.listMomentsRaw({
                        id,
                        page,
                        size,
                    });
                    break;
                case "GET v1/persons/{id}/photos":
                    response = await api.persons.listPhotosRaw({
                        id,
                        page,
                        size,
                    });
                    break;
                case "GET v1/persons/{id}/gallery":
                    response = await api.gallery.listGalleryRaw({
                        id,
                        page,
                        size,
                    });
                    break;
                case "GET v1/persons/{id}/games/dota2/matches":
                    response = await api.games.listDotaMatchesRaw({
                        id,
                        page,
                        size,
                    });
                    break;
                case "GET v1/games/dota2/events":
                    response = await api.games.listDotaMatchEventsRaw({
                        page,
                        size,
                    });
                    break;
                case "GET v1/persons/{id}/games/dota2/matches/{id}":
                    response = await api.games.getDotaMatchRaw({
                        id,
                        matchId: parts[6],
                    });
                    break;
                case "GET v1/persons/{id}/games/cs2/matches":
                    response = await api.games.listCsMatchesRaw({
                        id,
                        page,
                        size,
                    });
                    break;
                case "GET v1/games/cs2/events":
                    response = await api.games.listCsMatchEventsRaw({
                        page,
                        size,
                    });
                    break;
                case "GET v1/persons/{id}/games/cs2/matches/{id}":
                    response = await api.games.getCsMatchRaw({
                        id,
                        matchId: parts[6],
                    });
                    break;
                case "GET v1/persons/{id}/credit":
                    response = await api.interactions.listCreditRaw({
                        id,
                        page,
                        size,
                        sort,
                    });
                    break;
                case "POST v1/persons/{id}/credit":
                    response = await api.interactions.createCreditRaw({
                        id,
                        creditInput: CreditInputFromJSON(await request.json()),
                    });
                    break;
                case "DELETE v1/credit/{id}":
                    response = await api.interactions.deleteCreditRaw({ id });
                    break;
                case "PUT v1/moments/{id}/like":
                    response = await api.interactions.likeMomentRaw({ id });
                    break;
                case "DELETE v1/moments/{id}/like":
                    response = await api.interactions.unlikeMomentRaw({ id });
                    break;
                case "POST v1/persons/{id}/views":
                case "POST v1/media/{id}/views": {
                    if (
                        !request.headers
                            .get("cookie")
                            ?.split(";")
                            .some(
                                (part) =>
                                    part.trim() ===
                                    "PERSONS_OPTIONAL_COOKIES=accepted",
                            )
                    ) {
                        return new Response(null, {
                            status: 204,
                            headers: { "Cache-Control": "private, no-store" },
                        });
                    }
                    const cookie = request.headers
                        .get("cookie")
                        ?.split(";")
                        .map((part) => part.trim())
                        .find((part) => part.startsWith(`${VISITOR_COOKIE}=`))
                        ?.slice(VISITOR_COOKIE.length + 1);
                    visitor =
                        cookie && UUID_PATTERN.test(cookie)
                            ? cookie
                            : crypto.randomUUID();
                    response =
                        parts[1] === "media"
                            ? await api.gallery.recordMediaViewRaw({
                                  id,
                                  viewInput: { visitorId: visitor },
                              })
                            : await api.persons.recordViewRaw({
                                  id,
                                  viewInput: { visitorId: visitor },
                              });
                    break;
                }
                case "GET v1/media/{id}/content":
                    response = await api.media.readMediaRaw(
                        {
                            id,
                            range: request.headers.get("range") ?? undefined,
                        },
                        { signal: request.signal },
                    );
                    break;
                case "DELETE v1/media/{id}":
                    response = await api.media.deleteMediaRaw({ id });
                    break;
                case "GET v1/media/{id}/details":
                    response = await api.gallery.getMediaDetailRaw({
                        id,
                        ...(url.searchParams.get("mixed") === "true"
                            ? { mixed: true }
                            : {}),
                    });
                    break;
                case "GET v1/media/{id}/qualities":
                    response = await api.mediaQuality.listMediaQualitiesRaw({
                        id,
                    });
                    break;
                case "GET v1/media/{id}/qualities/{height}/content": {
                    const height = Number(parts[4]);
                    if (
                        !Number.isInteger(height) ||
                        height < 2 ||
                        height > 1080
                    ) {
                        return Response.json(
                            { code: "INVALID_INPUT" },
                            { status: 400 },
                        );
                    }
                    response = await api.mediaQuality.readMediaQualityRaw(
                        {
                            id,
                            height,
                            range: request.headers.get("range") ?? undefined,
                        },
                        { signal: request.signal },
                    );
                    break;
                }
                case "PUT v1/media/{id}/details":
                    response = await api.gallery.editMediaRaw({
                        id,
                        mediaEditInput: MediaEditInputFromJSON(
                            await request.json(),
                        ),
                    });
                    break;
                case "GET v1/media/{id}/preview":
                    response = await api.gallery.readMediaPreviewRaw(
                        { id },
                        { signal: request.signal },
                    );
                    break;
                case "PUT v1/media/{id}/reaction":
                    response = await api.gallery.reactToMediaRaw({
                        id,
                        mediaReactionInput: MediaReactionInputFromJSON(
                            await request.json(),
                        ),
                    });
                    break;
                case "DELETE v1/media/{id}/reaction":
                    response = await api.gallery.removeMediaReactionRaw({ id });
                    break;
                case "POST v1/persons/{id}/ownership-claims": {
                    const form = await request.formData();
                    const file = form.get("file");
                    if (!(file instanceof File)) {
                        return Response.json(
                            { code: "INVALID_INPUT" },
                            { status: 400 },
                        );
                    }
                    response = await api.claims.claimPersonRaw(
                        {
                            id,
                            file,
                            message: String(form.get("message") ?? ""),
                        },
                        { signal: request.signal },
                    );
                    break;
                }
                case "GET v1/admin/achievements":
                    response = await api.achievements.listAchievementsRaw({
                        page,
                        size,
                        q: url.searchParams.get("q") ?? undefined,
                    });
                    break;
                case "POST v1/admin/achievements": {
                    const form = await request.formData();
                    const file = form.get("file");
                    if (!(file instanceof File)) {
                        return Response.json(
                            { code: "INVALID_INPUT" },
                            { status: 400 },
                        );
                    }
                    response = await api.achievements.createAchievementRaw(
                        {
                            file,
                            title: String(form.get("title") ?? ""),
                            description: String(form.get("description") ?? ""),
                            type: AchievementTypeFromJSON(
                                form.get("type") ?? "MANUAL",
                            ),
                            pageAgeYears: form.has("pageAgeYears")
                                ? Number(form.get("pageAgeYears"))
                                : undefined,
                            active: form.has("active")
                                ? form.get("active") === "true"
                                : undefined,
                        },
                        { signal: request.signal },
                    );
                    break;
                }
                case "PUT v1/admin/achievements/{id}":
                    response = await api.achievements.updateAchievementRaw({
                        id: parts[3],
                        achievementInput: AchievementInputFromJSON(
                            await request.json(),
                        ),
                    });
                    break;
                case "DELETE v1/admin/achievements/{id}":
                    response = await api.achievements.deleteAchievementRaw({
                        id: parts[3],
                    });
                    break;
                case "PUT v1/admin/achievements/{id}/image": {
                    const form = await request.formData();
                    const file = form.get("file");
                    if (!(file instanceof File)) {
                        return Response.json(
                            { code: "INVALID_INPUT" },
                            { status: 400 },
                        );
                    }
                    response = await api.achievements.updateAchievementImageRaw(
                        { id: parts[3], file },
                        { signal: request.signal },
                    );
                    break;
                }
                case "GET v1/achievements/{id}/image":
                    response = await api.achievements.readAchievementImageRaw(
                        { id },
                        { signal: request.signal },
                    );
                    break;
                case "POST v1/admin/achievements/{id}/grants":
                    response = await api.achievements.grantAchievementRaw({
                        id: parts[3],
                        achievementGrantInput: AchievementGrantInputFromJSON(
                            await request.json(),
                        ),
                    });
                    break;
                case "DELETE v1/admin/achievements/{id}/grants/{id}":
                    response = await api.achievements.revokeAchievementRaw({
                        id: parts[3],
                        personId: parts[5],
                    });
                    break;
                case "GET v1/persons/{id}/achievements":
                    response = await api.achievements.listPersonAchievementsRaw(
                        { id, page, size },
                    );
                    break;
                case "GET v1/persons/recommendations":
                    response = await api.persons.recommendPersonsRaw({
                        size: Number(url.searchParams.get("size") ?? 5),
                    });
                    break;
                case "GET v1/publications/mine":
                    response = await api.publications.listMyPublicationsRaw({
                        page,
                        size,
                        kind: (url.searchParams.get("kind") ?? undefined) as
                            PublicationKind | undefined,
                        q: url.searchParams.get("q") ?? undefined,
                    });
                    break;
                case "GET v1/feed":
                    response = await api.feed.listFeedRaw({
                        page,
                        size,
                        kind: (url.searchParams.get("kind") ?? undefined) as
                            CommunityFeedFilter | undefined,
                    });
                    break;
                case "GET v1/feed/comments":
                    response = await api.feed.listCommentEventsRaw(
                        { page, size },
                        { signal: request.signal },
                    );
                    break;
                case "GET v1/notifications":
                    response = await api.notifications.listNotificationsRaw({
                        page,
                        size,
                    });
                    break;
                case "POST v1/notifications/read":
                    response = await api.notifications.readNotificationsRaw();
                    break;
                case "GET v1/admin/persons":
                    response = await api.admin.listAdminPersonsRaw({
                        page,
                        size,
                        q: url.searchParams.get("q") ?? undefined,
                    });
                    break;
                case "PUT v1/admin/persons/{id}/owner":
                    response = await api.admin.linkAccountRaw({
                        id: parts[3],
                        ownerLinkInput: OwnerLinkInputFromJSON(
                            await request.json(),
                        ),
                    });
                    break;
                case "GET v1/admin/persons/{id}":
                    response = await api.admin.getAdminPersonRaw({
                        id: parts[3],
                    });
                    break;
                case "PUT v1/admin/persons/{id}/reputation":
                    response =
                        await api.reputationAdmin.setReputationOverrideRaw({
                            id: parts[3],
                            reputationOverrideInput:
                                ReputationOverrideInputFromJSON(
                                    await request.json(),
                                ),
                        });
                    break;
                case "POST v1/admin/content/{kind}/{id}/hide":
                    response = await api.contentAdmin.hideAdminContentRaw({
                        kind: parts[3] as AdminContentKind,
                        id: parts[4],
                        contentHideInput: ContentHideInputFromJSON(
                            await request.json(),
                        ),
                    });
                    break;
                case "GET v1/admin/content": {
                    const from = url.searchParams.get("createdFrom");
                    const to = url.searchParams.get("createdTo");
                    if (
                        (from && !Number.isFinite(Date.parse(from))) ||
                        (to && !Number.isFinite(Date.parse(to)))
                    ) {
                        return Response.json(
                            { code: "INVALID_INPUT" },
                            { status: 400 },
                        );
                    }
                    response = await api.contentAdmin.listAdminContentRaw({
                        page,
                        size,
                        status: (url.searchParams.get("status") ??
                            undefined) as AdminContentStatus | undefined,
                        kind: (url.searchParams.get("kind") ?? undefined) as
                            AdminContentKind | undefined,
                        q: url.searchParams.get("q") ?? undefined,
                        authorId: url.searchParams.get("authorId") ?? undefined,
                        personId: url.searchParams.get("personId") ?? undefined,
                        createdFrom: from ? new Date(from) : undefined,
                        createdTo: to ? new Date(to) : undefined,
                        order: (url.searchParams.get("order") ?? undefined) as
                            AdminContentOrder | undefined,
                    });
                    break;
                }
                case "GET v1/admin/moderation/{id}":
                    response = await api.admin.getModerationRaw({
                        id: parts[3],
                    });
                    break;
                case "GET v1/admin/moderation": {
                    const createdFrom = url.searchParams.get("createdFrom");
                    const createdTo = url.searchParams.get("createdTo");
                    if (
                        [createdFrom, createdTo].some(
                            (value) =>
                                value !== null &&
                                !Number.isFinite(Date.parse(value)),
                        )
                    ) {
                        return Response.json(
                            { code: "INVALID_INPUT" },
                            { status: 400 },
                        );
                    }
                    response = await api.admin.listModerationRaw({
                        page,
                        size,
                        status: (url.searchParams.get("status") ??
                            "PENDING") as ModerationFilterStatus,
                        type: (url.searchParams.get("type") ?? undefined) as
                            ModerationContentType | undefined,
                        q: url.searchParams.get("q") ?? undefined,
                        authorId: url.searchParams.get("authorId") ?? undefined,
                        personId: url.searchParams.get("personId") ?? undefined,
                        createdFrom: createdFrom
                            ? new Date(createdFrom)
                            : undefined,
                        createdTo: createdTo ? new Date(createdTo) : undefined,
                        order: (url.searchParams.get("order") ??
                            "OLDEST") as ModerationOrder,
                    });
                    break;
                }
                case "POST v1/admin/moderation/{id}/decision":
                    response = await api.admin.decideModerationRaw({
                        id: parts[3],
                        decisionInput: DecisionInputFromJSON(
                            await request.json(),
                        ),
                    });
                    break;
                default:
                    return Response.json(
                        { code: "CONTENT_NOT_FOUND" },
                        { status: 404 },
                    );
            }
        }

        const headers = new Headers({
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        });

        for (const name of [
            "Content-Type",
            "Content-Length",
            "Content-Range",
            "Accept-Ranges",
            "Content-Disposition",
        ]) {
            const value = response.raw.headers.get(name);

            if (value) {
                headers.set(name, value);
            }
        }

        if (visitor) {
            headers.append(
                "Set-Cookie",
                `${VISITOR_COOKIE}=${visitor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${VISITOR_MAX_AGE}${new URL(config.publicUrl).protocol === "https:" ? "; Secure" : ""}`,
            );
        }

        return new Response(response.raw.body, {
            status: response.raw.status,
            headers,
        });
    } catch (error) {
        if (error instanceof ResponseError) {
            if (
                error.response.status >= 500 ||
                !error.response.headers.get("content-type")?.includes("json")
            ) {
                return Response.json(
                    {
                        code:
                            error.response.status < 500
                                ? "INVALID_INPUT"
                                : "UNAVAILABLE",
                    },
                    {
                        status: error.response.status,
                        headers: { "Cache-Control": "no-store" },
                    },
                );
            }
            const headers = new Headers({
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
            });
            const contentRange = error.response.headers.get("content-range");

            if (contentRange) {
                headers.set("Content-Range", contentRange);
            }

            return new Response(error.response.body, {
                status: error.response.status,
                headers,
            });
        }

        console.error("Person backend request failed", {
            cause: error instanceof Error ? error.name : "Unknown",
        });

        return Response.json(
            {
                code:
                    error instanceof SyntaxError
                        ? "INVALID_INPUT"
                        : "UNAVAILABLE",
            },
            { status: error instanceof SyntaxError ? 400 : 503 },
        );
    }
}
