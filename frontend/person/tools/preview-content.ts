import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomInt, randomUUID } from 'node:crypto';
import path from 'node:path';
import type {
    Comment,
    CommentEvent,
    CreditEntry,
    MediaDetail,
    PersonAchievement,
    PersonProfile,
    PersonRating,
    Photo,
    MyPublication,
    CommunityFeedEvent,
} from '@persons/person-client';

export function createPreviewContent(
    profiles: PersonProfile[],
    assetsRoot: string,
    empty = false,
    games: readonly CommunityFeedEvent[] = [],
) {
    const comments = new Map<string, Comment[]>();
    const ratings = new Map<string, PersonRating[]>();
    const credit = new Map<string, CreditEntry[]>();
    const achievements = new Map<string, PersonAchievement[]>();
    const media = new Map<string, MediaDetail>();
    const sources = new Map<string, { file?: string; bytes?: Buffer; type: string; preview?: Buffer }>();
    const owner = profiles[0];
    const author = { authorName: owner.fullName, authorTag: owner.tag };
    const startedAt = Date.now();
    const ages = [30_000, 120_000, 1_200_000, 3_600_000, 10_800_000, 86_400_000];

    profiles.slice(0, empty ? 0 : 2).forEach((profile, round) => {
        profile.stats.comments = 1;
        profile.stats.ratings = 1;
        profile.stats.creditEntries = 1;
        profile.stats.photos = 1;
        profile.stats.moments = 1;
        const date = (offset: number) => new Date(startedAt - round * 172_800_000 - ages[offset]);
        comments.set(profile.id, [
            {
                id: randomUUID(),
                text: round ? 'В субботу снова собираемся вместе.' : 'Собираемся вечером за настолками. Кто с нами?',
                ...author,
                createdAt: date(0),
                canRemove: false,
                canEdit: false,
                likes: 24,
                dislikes: 2,
                moderationStatus: 'APPROVED',
            },
        ]);
        ratings.set(profile.id, [
            {
                id: randomUUID(),
                value: round ? 4 : 5,
                emoji: '💜',
                ...author,
                createdAt: date(2),
                comment: 'Всегда рад встрече с этим человеком.',
                likes: 12,
                dislikes: 1,
                commentStatus: 'APPROVED',
            },
        ]);
        credit.set(profile.id, [
            {
                id: randomUUID(),
                kind: round ? 'SHORT_DELAY' : 'ON_TIME',
                description: round
                    ? 'Вернул с небольшой задержкой, заранее предупредил.'
                    : 'Вернул займ вовремя, без напоминаний.',
                ...author,
                createdAt: date(5),
                canRemove: false,
                likes: 8,
                dislikes: 1,
                moderationStatus: 'APPROVED',
            },
        ]);
        achievements.set(profile.id, [
            {
                id: randomUUID(),
                achievement: {
                    id: `a0000000-0000-4000-9000-00000000000${round + 1}`,
                    title: 'Год на странице',
                    description: 'Первый год истории этой страницы.',
                    active: true,
                    createdAt: date(3),
                    version: 0,
                    type: 'AUTOMATIC',
                    pageAgeYears: 1,
                },
                assignedAt: date(3),
                note: '',
            },
        ]);
        [false, true].forEach((video) => {
            const id = randomUUID();
            media.set(id, {
                id,
                personId: profile.id,
                kind: video ? 'MOMENT' : 'PHOTO',
                caption: video ? 'Наш вечер за играми' : 'Тот самый вечер, который хочется повторить.',
                ...author,
                createdAt: date(video ? 4 : 1),
                taggedPersons: [],
                reactions: { likes: video ? 31 : 38, dislikes: 2 },
                comments: 1,
                durationSeconds: video ? 4 : 0,
                previewAvailable: video,
                canEdit: false,
                canRemove: false,
                canInteract: true,
                views: 128,
                moderationStatus: 'APPROVED',
            });
            sources.set(id, {
                file: video
                    ? path.resolve(import.meta.dirname, '../.cache/feed/moment.webm')
                    : path.join(assetsRoot, 'illustrations/play-board-v3.webp'),
                type: video ? 'video/webm' : 'image/webp',
            });
            const existing = comments.get(profile.id) ?? [];
            existing.push({
                id: randomUUID(),
                text: 'Отлично провели время!',
                ...author,
                createdAt: date(0),
                mediaId: id,
                canRemove: false,
                likes: 3,
                dislikes: 0,
                moderationStatus: 'APPROVED',
            });
            comments.set(profile.id, existing);
        });
    });

    function json(response: ServerResponse, value: unknown, status = 200) {
        response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify(value));
    }
    async function body(request: IncomingMessage, limit = 65536) {
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of request) {
            const bytes = Buffer.from(chunk);
            size += bytes.length;
            if (size > limit) {
                throw new Error('Preview body is too large');
            }
            chunks.push(bytes);
        }
        return Buffer.concat(chunks);
    }
    const receipt = () => ({ id: randomUUID(), status: 'APPROVED' });

    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
        authenticated: boolean,
    ): Promise<boolean> => {
        if (url.pathname === '/v1/persons/directory' && request.method === 'GET') {
            const page = Math.max(0, Number(url.searchParams.get('page') ?? 0));
            const size = Math.max(1, Math.min(60, Number(url.searchParams.get('size') ?? 12)));
            const items = profiles.map(({ id, tag, fullName, avatarMediaId, stats }) => ({
                id,
                tag,
                fullName,
                avatarMediaId,
                views: stats.views,
                photos: stats.photos,
                moments: stats.moments,
                ratingAverage: stats.ratingAverage,
            }));
            const order = url.searchParams.get('order');
            items.sort((a, b) =>
                order === 'NAME'
                    ? a.fullName.localeCompare(b.fullName)
                    : order === 'RATING'
                      ? (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0)
                      : b.views - a.views,
            );
            json(response, { items: items.slice(page * size, (page + 1) * size), page, size, total: items.length });
            return true;
        }
        if (url.pathname === '/v1/feed' && request.method === 'GET') {
            const events = profiles.flatMap((profile): CommunityFeedEvent[] => {
                const page = {
                    id: profile.id,
                    tag: profile.tag,
                    fullName: profile.fullName,
                    avatarMediaId: profile.avatarMediaId,
                };
                return [
                    ...(comments.get(profile.id) ?? []).map((comment): CommunityFeedEvent => ({
                        id: `comment:${comment.id}`,
                        page,
                        kind: comment.mediaId || comment.momentId ? 'COMMENT' : 'WALL',
                        createdAt: comment.createdAt,
                        comment,
                        contextMediaKind: media.get(comment.mediaId ?? comment.momentId ?? '')?.kind,
                    })),
                    ...(ratings.get(profile.id) ?? []).map((rating): CommunityFeedEvent => ({
                        id: `rating:${rating.id}`,
                        page,
                        kind: 'RATING',
                        createdAt: rating.createdAt,
                        rating,
                    })),
                    ...(credit.get(profile.id) ?? []).map((entry): CommunityFeedEvent => ({
                        id: `loan:${entry.id}`,
                        page,
                        kind: 'LOAN',
                        createdAt: entry.createdAt,
                        credit: entry,
                    })),
                    ...(achievements.get(profile.id) ?? []).map((achievement): CommunityFeedEvent => ({
                        id: `achievement:${achievement.id}`,
                        page,
                        kind: 'ACHIEVEMENT',
                        createdAt: achievement.assignedAt,
                        achievement,
                    })),
                    ...[...media.values()]
                        .filter((item) => item.personId === profile.id && item.kind !== 'AVATAR')
                        .map((item): CommunityFeedEvent => {
                            const payload = {
                                id: item.id,
                                mediaId: item.id,
                                title: item.caption,
                                createdAt: item.createdAt,
                                canRemove: false,
                                moderationStatus: item.moderationStatus,
                            };
                            return item.kind === 'PHOTO'
                                ? {
                                      id: `photo:${item.id}`,
                                      page,
                                      kind: 'PHOTO',
                                      createdAt: item.createdAt,
                                      photo: payload,
                                  }
                                : {
                                      id: `moment:${item.id}`,
                                      page,
                                      kind: 'MOMENT',
                                      createdAt: item.createdAt,
                                      moment: {
                                          ...payload,
                                          authorName: item.authorName,
                                          likes: item.reactions.likes,
                                          liked: false,
                                          comments: item.comments,
                                      },
                                  };
                        }),
                ];
            });
            const kind = url.searchParams.get('kind');
            const items = [...events, ...(empty ? [] : games)]
                .filter(
                    (event) => !kind || event.kind === kind || (kind === 'GAME' && ['DOTA', 'CS'].includes(event.kind)),
                )
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id));
            const page = Math.max(0, Number(url.searchParams.get('page') ?? 0));
            const size = Math.max(1, Math.min(50, Number(url.searchParams.get('size') ?? 12)));
            json(response, { items: items.slice(page * size, (page + 1) * size), page, size, total: items.length });
            return true;
        }
        if (url.pathname === '/v1/persons/recommendations' && request.method === 'GET') {
            const size = Math.max(1, Math.min(6, Number(url.searchParams.get('size') ?? 5)));
            const candidates = profiles.filter((profile) => !empty && (!authenticated || profile.id !== owner.id));
            // Fisher–Yates on disposable fixtures; production samples in the database.
            for (let index = candidates.length - 1; index > 0; index -= 1) {
                const target = randomInt(index + 1);
                [candidates[index], candidates[target]] = [candidates[target], candidates[index]];
            }
            json(
                response,
                candidates
                    .slice(0, size)
                    .map(({ id, tag, fullName, avatarMediaId }) => ({ id, tag, fullName, avatarMediaId })),
            );
            return true;
        }
        if (url.pathname === '/v1/publications/mine' && request.method === 'GET') {
            if (!authenticated) {
                json(response, { code: 'UNAUTHORIZED' }, 401);
                return true;
            }
            const items = profiles
                .flatMap((profile): MyPublication[] => {
                    const page = { id: profile.id, tag: profile.tag, fullName: profile.fullName };
                    return [
                        ...(comments.get(profile.id) ?? []).map((comment): MyPublication => ({
                            id: comment.id,
                            kind: 'COMMENT',
                            page,
                            createdAt: comment.createdAt,
                            comment,
                            contextMediaKind: comment.mediaId ? media.get(comment.mediaId)?.kind : undefined,
                        })),
                        ...(ratings.get(profile.id) ?? []).map((rating): MyPublication => ({
                            id: rating.id,
                            kind: 'RATING',
                            page,
                            createdAt: rating.createdAt,
                            rating,
                        })),
                        ...(credit.get(profile.id) ?? []).map((entry): MyPublication => ({
                            id: entry.id,
                            kind: 'CREDIT',
                            page,
                            createdAt: entry.createdAt,
                            credit: entry,
                        })),
                        ...[...media.values()]
                            .filter((item) => item.personId === profile.id)
                            .map((item): MyPublication => ({
                                id: item.id,
                                kind: item.kind === 'MOMENT' ? 'MOMENT' : 'PHOTO',
                                page,
                                createdAt: item.createdAt,
                                ...(item.kind === 'MOMENT'
                                    ? {
                                          moment: {
                                              id: item.id,
                                              mediaId: item.id,
                                              title: item.caption,
                                              authorName: item.authorName,
                                              createdAt: item.createdAt,
                                              likes: item.reactions.likes,
                                              liked: false,
                                              comments: item.comments,
                                              canRemove: false,
                                              previewAvailable: item.previewAvailable,
                                              durationSeconds: item.durationSeconds,
                                              views: item.views,
                                              moderationStatus: item.moderationStatus,
                                          },
                                      }
                                    : {
                                          photo: {
                                              id: item.id,
                                              mediaId: item.id,
                                              title: item.caption,
                                              createdAt: item.createdAt,
                                              canRemove: false,
                                              views: item.views,
                                              moderationStatus: item.moderationStatus,
                                          },
                                      }),
                            })),
                    ];
                })
                .filter((item) => {
                    const kind = url.searchParams.get('kind');
                    const q = (url.searchParams.get('q') ?? '').trim().toLocaleLowerCase();
                    return (
                        (!kind || item.kind === kind) &&
                        (!q || `${item.page.fullName} ${item.page.tag}`.toLocaleLowerCase().includes(q))
                    );
                })
                .sort(
                    (a, b) =>
                        b.createdAt.getTime() - a.createdAt.getTime() ||
                        a.kind.localeCompare(b.kind) ||
                        a.id.localeCompare(b.id),
                );
            const page = Math.max(0, Number(url.searchParams.get('page') ?? 0));
            const size = Math.max(1, Math.min(60, Number(url.searchParams.get('size') ?? 12)));
            json(response, { items: items.slice(page * size, (page + 1) * size), total: items.length, page, size });
            return true;
        }
        if (url.pathname === '/v1/persons/mine' && request.method === 'GET') {
            json(response, {
                person: { id: owner.id, tag: owner.tag, fullName: owner.fullName },
                pendingCreation: false,
            });
            return true;
        }
        if (url.pathname === '/v1/feed/comments' && request.method === 'GET') {
            const items = profiles
                .flatMap((profile): CommentEvent[] =>
                    (comments.get(profile.id) ?? []).flatMap((comment): CommentEvent[] => {
                        const detail = media.get(comment.mediaId ?? comment.momentId ?? '');
                        return detail &&
                            detail.kind !== 'AVATAR' &&
                            detail.moderationStatus === 'APPROVED' &&
                            comment.moderationStatus === 'APPROVED'
                            ? [
                                  {
                                      page: { id: profile.id, tag: profile.tag, fullName: profile.fullName },
                                      comment,
                                      contextMediaKind: detail.kind,
                                  },
                              ]
                            : [];
                    }),
                )
                .sort(
                    (a, b) =>
                        b.comment.createdAt.getTime() - a.comment.createdAt.getTime() ||
                        b.comment.id.localeCompare(a.comment.id),
                );
            const page = Math.max(0, Number(url.searchParams.get('page') ?? 0));
            const size = Math.max(1, Math.min(60, Number(url.searchParams.get('size') ?? 12)));
            json(response, { items: items.slice(page * size, (page + 1) * size), page, size, total: items.length });
            return true;
        }
        const list = /^\/v1\/persons\/([^/]+)\/(comments|ratings|credit|photos|moments|achievements)$/.exec(
            url.pathname,
        );
        if (list && request.method === 'GET') {
            const [, id, kind] = list;
            const mediaId = url.searchParams.get('mediaId') || url.searchParams.get('momentId');
            const items =
                kind === 'comments'
                    ? (comments.get(id) ?? []).filter((item) =>
                          mediaId ? item.mediaId === mediaId : !item.mediaId && !item.momentId,
                      )
                    : kind === 'ratings'
                      ? (ratings.get(id) ?? [])
                      : kind === 'credit'
                        ? (credit.get(id) ?? [])
                        : kind === 'achievements'
                          ? (achievements.get(id) ?? [])
                          : [...media.values()]
                                .filter(
                                    (item) =>
                                        item.personId === id && item.kind === (kind === 'photos' ? 'PHOTO' : 'MOMENT'),
                                )
                                .map((item): Photo => ({
                                    id: item.id,
                                    mediaId: item.id,
                                    title: item.caption,
                                    createdAt: item.createdAt,
                                    canRemove: false,
                                    views: item.views,
                                    previewAvailable: item.previewAvailable,
                                    durationSeconds: item.durationSeconds,
                                    moderationStatus: 'APPROVED',
                                }));
            const page = Math.max(0, Number(url.searchParams.get('page') ?? 0));
            const size = Math.max(1, Math.min(60, Number(url.searchParams.get('size') ?? 10)));
            json(response, { items: items.slice(page * size, (page + 1) * size), page, size, total: items.length });
            return true;
        }
        const addComment = /^\/v1\/persons\/([^/]+)\/comments$/.exec(url.pathname);
        if (addComment && request.method === 'POST') {
            if (!authenticated) {
                json(response, { code: 'UNAUTHORIZED' }, 401);
                return true;
            }
            const input = JSON.parse((await body(request)).toString('utf8')) as {
                text: string;
                mediaId?: string;
                momentId?: string;
            };
            if (!input.text?.trim() || input.text.length > 2000) {
                json(response, { code: 'INVALID_INPUT' }, 400);
                return true;
            }
            const values = comments.get(addComment[1]) ?? [];
            values.unshift({
                id: randomUUID(),
                ...author,
                text: input.text.trim(),
                mediaId: input.mediaId ?? input.momentId,
                createdAt: new Date(),
                canRemove: false,
                likes: 0,
                dislikes: 0,
                moderationStatus: 'APPROVED',
            });
            comments.set(addComment[1], values);
            const profile = profiles.find((item) => item.id === addComment[1]);
            if (profile && !input.mediaId && !input.momentId) {
                profile.stats.comments += 1;
            }
            const detail = media.get(input.mediaId ?? input.momentId ?? '');
            if (detail) {
                detail.comments += 1;
            }
            json(response, receipt());
            return true;
        }
        const upload = /^\/v1\/persons\/([^/]+)\/media$/.exec(url.pathname);
        if (upload && request.method === 'POST') {
            if (!authenticated) {
                json(response, { code: 'UNAUTHORIZED' }, 401);
                return true;
            }
            const form = await new Response(new Uint8Array(await body(request, 64 * 1024 * 1024)), {
                headers: { 'Content-Type': request.headers['content-type'] ?? '' },
            }).formData();
            const file = form.get('file');
            const kind = form.get('kind');
            if (!(file instanceof File) || !['PHOTO', 'MOMENT'].includes(String(kind))) {
                json(response, { code: 'INVALID_INPUT' }, 400);
                return true;
            }
            const id = randomUUID();
            const preview = form.get('preview');
            const profile = profiles.find((item) => item.id === upload[1]);
            if (profile) {
                profile.stats[kind === 'PHOTO' ? 'photos' : 'moments'] += 1;
            }
            media.set(id, {
                id,
                personId: upload[1],
                kind: kind as 'PHOTO' | 'MOMENT',
                caption: String(form.get('caption') ?? ''),
                ...author,
                createdAt: new Date(),
                taggedPersons: [],
                reactions: { likes: 0, dislikes: 0 },
                comments: 0,
                durationSeconds: Number(form.get('durationSeconds') ?? 0),
                previewAvailable: preview instanceof File,
                canEdit: false,
                canRemove: false,
                canInteract: true,
                views: 0,
                moderationStatus: 'APPROVED',
            });
            sources.set(id, {
                bytes: Buffer.from(await file.arrayBuffer()),
                type: file.type,
                preview: preview instanceof File ? Buffer.from(await preview.arrayBuffer()) : undefined,
            });
            json(response, receipt());
            return true;
        }
        const mediaRoute = /^\/v1\/media\/([^/]+)\/(details|content|preview|reaction|views|qualities)$/.exec(
            url.pathname,
        );
        if (mediaRoute) {
            const [, id, action] = mediaRoute;
            const detail = media.get(id);
            if (!detail) {
                json(response, { code: 'CONTENT_NOT_FOUND' }, 404);
                return true;
            }
            if (action === 'details') {
                json(response, detail);
                return true;
            }
            if (action === 'qualities') {
                json(response, { items: [], processing: false });
                return true;
            }
            if (action === 'views') {
                detail.views = (detail.views ?? 0) + 1;
                json(response, { views: detail.views });
                return true;
            }
            if (action === 'reaction') {
                if (!authenticated) {
                    json(response, { code: 'UNAUTHORIZED' }, 401);
                    return true;
                }
                if (detail.reactions.reaction) {
                    detail.reactions[detail.reactions.reaction === 'LIKE' ? 'likes' : 'dislikes'] -= 1;
                }
                const reaction =
                    request.method === 'DELETE'
                        ? undefined
                        : (JSON.parse((await body(request)).toString('utf8')) as { reaction: 'LIKE' | 'DISLIKE' })
                              .reaction;
                detail.reactions.reaction = reaction;
                if (reaction) {
                    detail.reactions[reaction === 'LIKE' ? 'likes' : 'dislikes'] += 1;
                }
                json(response, detail.reactions);
                return true;
            }
            const source = sources.get(id);
            const bytes =
                action === 'preview'
                    ? (source?.preview ?? (await readFile(path.join(assetsRoot, 'illustrations/play-console-v3.webp'))))
                    : (source?.bytes ?? (await readFile(source!.file!)));
            const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
            const start = range ? Number(range[1]) : 0;
            const end = range?.[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
            if (start > end || start >= bytes.length) {
                response.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` });
                response.end();
                return true;
            }
            response.writeHead(range ? 206 : 200, {
                'Content-Type': action === 'preview' ? (source?.preview ? 'image/jpeg' : 'image/webp') : source!.type,
                'Content-Length': end - start + 1,
                'Accept-Ranges': 'bytes',
                ...(range ? { 'Content-Range': `bytes ${start}-${end}/${bytes.length}` } : {}),
            });
            response.end(bytes.subarray(start, end + 1));
            return true;
        }
        const engagement = /^\/v1\/content\/(COMMENT|RATING|LOAN)\/([^/]+)\/(reaction|like)$/.exec(url.pathname);
        if (engagement) {
            if (!authenticated) {
                json(response, { code: 'UNAUTHORIZED' }, 401);
                return true;
            }
            const [, kind, id] = engagement;
            const list =
                kind === 'COMMENT'
                    ? [...comments.values()].flat()
                    : kind === 'RATING'
                      ? [...ratings.values()].flat()
                      : [...credit.values()].flat();
            const item = list.find((entry) => entry.id === id);
            if (!item) {
                json(response, { code: 'CONTENT_NOT_FOUND' }, 404);
                return true;
            }
            item.likes = Math.max(0, (item.likes ?? 0) - Number(item.likedByMe ?? false));
            item.dislikes = Math.max(0, (item.dislikes ?? 0) - Number(item.dislikedByMe ?? false));
            const reaction =
                request.method === 'DELETE'
                    ? undefined
                    : (JSON.parse((await body(request)).toString('utf8')) as { reaction: string }).reaction;
            item.likedByMe = reaction === 'LIKE';
            item.dislikedByMe = reaction === 'DISLIKE';
            item.likes += Number(item.likedByMe);
            item.dislikes += Number(item.dislikedByMe);
            json(response, {
                count: item.likes,
                liked: item.likedByMe,
                dislikes: item.dislikes,
                disliked: item.dislikedByMe,
            });
            return true;
        }
        if (/^\/v1\/achievements\/[^/]+\/image$/.test(url.pathname)) {
            response.writeHead(200, { 'Content-Type': 'image/webp' });
            response.end(await readFile(path.join(assetsRoot, 'illustrations/empty-achievements-evgeny-v2.webp')));
            return true;
        }
        return false;
    };
}
