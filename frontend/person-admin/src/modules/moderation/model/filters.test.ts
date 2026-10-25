import { expect, it } from 'vitest';
import {
    defaultModerationFilters,
    moderationRequest,
    readModerationFilters,
    moderationFilterParams,
} from '@/modules/moderation/model/filters';
import {
    defaultContentFilters,
    contentRequest,
    contentFilterParams,
    readContentFilters,
} from '@/modules/content/model/filters';

it('persists applied filters and pagination without losing exact author and destination', () => {
    const filters = {
        ...defaultModerationFilters,
        q: 'Поход',
        type: 'PHOTO' as const,
        status: 'ALL' as const,
        authorId: '11111111-1111-4111-8111-111111111111',
        personId: '22222222-2222-4222-8222-222222222222',
        page: 2,
        size: 50,
    };
    expect(readModerationFilters(moderationFilterParams(filters))).toEqual(filters);
});
it('ignores malformed query values and uses an exclusive end date in Moscow time', () => {
    const filters = readModerationFilters(
        new URLSearchParams('page=-1&size=1000&status=bad&type=bad&authorId=bad&from=2026-02-30'),
    );
    expect(filters).toEqual(defaultModerationFilters);
    const request = moderationRequest({ ...filters, from: '2026-10-21', to: '2026-10-21' });
    expect(request.createdFrom?.toISOString()).toBe('2026-10-20T21:00:00.000Z');
    expect(request.createdTo?.toISOString()).toBe('2026-10-21T21:00:00.000Z');
});
it('catalog defaults to all statuses and round trips hidden content filters', () => {
    expect(contentRequest(defaultContentFilters).status).toBeUndefined();
    const filters = {
        ...defaultContentFilters,
        type: 'RATING' as const,
        status: 'HIDDEN' as const,
        q: 'Тест',
        order: 'PAGE' as const,
        page: 3,
    };
    expect(readContentFilters(contentFilterParams(filters))).toEqual(filters);
    expect(contentRequest(filters)).toMatchObject({
        kind: 'RATING',
        status: 'HIDDEN',
        q: 'Тест',
        page: 3,
        order: 'PAGE',
    });
});
