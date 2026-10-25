import { beforeEach, expect, it, vi } from 'vitest';
import type { CommunityFeedEvent } from '@persons/person-client';
import { loadFeedPage, toFeedEvent } from '@/modules/feed/model/loadFeedPage';
import { previewCsMatches } from '@/modules/integrations/model/previewCsMatches';

const api = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({ personClient: { feed: { listFeed: api.list } } }));
beforeEach(() => {
    api.list.mockReset();
});
const base = {
    id: 'old-event',
    page: { id: 'real-page', tag: 'real-tag', fullName: 'Реальный человек' },
    createdAt: new Date('2024-01-01'),
};

it('loads the requested server page with all historical events and the server total', async () => {
    const comment = {
        id: 'old-comment',
        text: 'Старая запись',
        authorName: 'Автор',
        createdAt: base.createdAt,
        canRemove: false,
    };
    api.list.mockResolvedValue({ items: [{ ...base, kind: 'WALL', comment }], page: 5, size: 12, total: 65 });
    const controller = new AbortController();
    const result = await loadFeedPage(5, 'all', controller.signal);
    expect(api.list).toHaveBeenCalledWith({ page: 5, size: 12, kind: undefined }, { signal: controller.signal });
    expect(result).toEqual({ page: 5, size: 12, total: 65, items: [{ ...base, kind: 'wall', content: comment }] });
});

it('filters games on the server and maps actual CS matches', async () => {
    const cs = { ...previewCsMatches[0], playedAt: base.createdAt };
    api.list.mockResolvedValue({ items: [{ ...base, kind: 'CS', cs }], page: 0, size: 12, total: 1 });
    const result = await loadFeedPage(0, 'game', new AbortController().signal);
    expect(api.list).toHaveBeenCalledWith(expect.objectContaining({ kind: 'GAME' }), expect.anything());
    expect(result.items[0]).toMatchObject({ ...base, kind: 'game', game: 'cs2', content: { id: cs.id } });
});

it('does not turn a broken response or network failure into an empty feed', async () => {
    expect(() => toFeedEvent({ ...base, kind: 'PHOTO' } as CommunityFeedEvent)).toThrow('payload is missing');
    api.list.mockRejectedValue(new Error('Offline'));
    await expect(loadFeedPage(0, 'all', new AbortController().signal)).rejects.toThrow('Offline');
});
