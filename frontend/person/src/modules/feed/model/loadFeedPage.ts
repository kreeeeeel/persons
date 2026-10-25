import type { CommunityFeedEvent, CommunityFeedFilter } from '@persons/person-client';
import { personClient } from '@persons/person-domain/api/browser';
import type { FeedEvent, FeedKind } from '@/modules/feed/model/FeedEvent';
import { toDotaMatch } from '@/modules/integrations/model/toDotaMatch';
import { toCsMatch } from '@/modules/integrations/model/toCsMatch';

const filters: Record<FeedKind, CommunityFeedFilter> = {
    wall: 'WALL',
    comment: 'COMMENT',
    rating: 'RATING',
    loan: 'LOAN',
    photo: 'PHOTO',
    moment: 'MOMENT',
    achievement: 'ACHIEVEMENT',
    game: 'GAME',
};

function payload<T>(value: T | undefined): T {
    if (value === undefined) {
        throw new Error('Feed event payload is missing');
    }
    return value;
}

export function toFeedEvent(event: CommunityFeedEvent): FeedEvent {
    const base = { id: event.id, page: event.page, createdAt: event.createdAt };
    switch (event.kind) {
        case 'WALL':
            return { ...base, kind: 'wall', content: payload(event.comment) };
        case 'COMMENT':
            return {
                ...base,
                kind: 'comment',
                content: payload(event.comment),
                contextMediaKind: event.contextMediaKind,
            };
        case 'RATING':
            return { ...base, kind: 'rating', content: payload(event.rating) };
        case 'LOAN':
            return { ...base, kind: 'loan', content: payload(event.credit) };
        case 'PHOTO':
            return { ...base, kind: 'photo', content: payload(event.photo) };
        case 'MOMENT':
            return { ...base, kind: 'moment', content: payload(event.moment) };
        case 'ACHIEVEMENT':
            return { ...base, kind: 'achievement', content: payload(event.achievement) };
        case 'DOTA':
            return { ...base, kind: 'game', content: toDotaMatch(payload(event.dota)) };
        case 'CS':
            return { ...base, kind: 'game', game: 'cs2', content: toCsMatch(payload(event.cs)) };
    }
}

export async function loadFeedPage(page: number, kind: FeedKind | 'all', signal: AbortSignal) {
    const result = await personClient.feed.listFeed(
        { page, size: 12, kind: kind === 'all' ? undefined : filters[kind] },
        { signal },
    );
    return { ...result, items: result.items.map(toFeedEvent) };
}
