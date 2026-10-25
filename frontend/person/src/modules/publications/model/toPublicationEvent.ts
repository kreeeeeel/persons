import type { MyPublication } from '@persons/person-client';
import type { FeedEvent } from '@/modules/feed/model/FeedEvent';

export function toPublicationEvent(publication: MyPublication): FeedEvent {
    const base = {
        id: `${publication.kind}:${publication.id}`,
        page: publication.page,
        createdAt: publication.createdAt,
    };
    if (publication.kind === 'COMMENT' && publication.comment) {
        return {
            ...base,
            kind: publication.contextMediaKind ? 'comment' : 'wall',
            content: publication.comment,
            contextMediaKind: publication.contextMediaKind,
        };
    }
    if (publication.kind === 'RATING' && publication.rating) {
        return { ...base, kind: 'rating', content: publication.rating };
    }
    if (publication.kind === 'CREDIT' && publication.credit) {
        return { ...base, kind: 'loan', content: publication.credit };
    }
    if (publication.kind === 'PHOTO' && publication.photo) {
        return { ...base, kind: 'photo', content: publication.photo };
    }
    if (publication.kind === 'MOMENT' && publication.moment) {
        return { ...base, kind: 'moment', content: publication.moment };
    }
    throw new Error(`Missing content for publication kind ${publication.kind}`);
}
