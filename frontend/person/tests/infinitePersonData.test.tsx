import { act, cleanup, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { useInfinitePersonData } from '@persons/person-domain/hooks/useInfinitePersonData';
import { InfiniteFeedLoader } from '@persons/person-domain/InfiniteFeedLoader';
import { RatingValue } from '@persons/person-domain/RatingValue';
import { notifyAccountProfileChanged } from '@persons/person-domain/account/profileChanges';

vi.mock('@persons/person-domain/api/browser', () => ({ personError: async () => 'UNAVAILABLE' }));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const page = (number: number, ids: string[], total = 4) => ({
    items: ids.map((id) => ({ id })),
    page: number,
    size: 2,
    total,
});

it('refreshes every loaded comment page after an account change without clearing the list', async () => {
    let version = 1;
    const load = vi.fn(async (number: number) => ({
        ...page(number, number === 0 ? ['a', 'b'] : ['c', 'd']),
        items: (number === 0 ? ['a', 'b'] : ['c', 'd']).map((id) => ({ id, authorAvatarUrl: `/avatar?v=${version}` })),
    }));
    const { result } = renderHook(() => useInfinitePersonData('comments', load));
    await waitFor(() => expect(result.current.data?.items).toHaveLength(2));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.data?.items).toHaveLength(4));
    version = 2;
    act(notifyAccountProfileChanged);
    expect(result.current.data?.items).toHaveLength(4);
    expect(result.current.loading).toBe(false);
    await waitFor(() =>
        expect(result.current.data?.items.every((item) => item.authorAvatarUrl === '/avatar?v=2')).toBe(true),
    );
    expect(load.mock.calls.map(([number]) => number)).toEqual([0, 1, 0, 1]);
});

it('refreshes all visible pages in the background without clearing the list', async () => {
    let finish: ((value: ReturnType<typeof page>) => void) | undefined;
    const load = vi
        .fn()
        .mockResolvedValueOnce(page(0, ['a', 'b']))
        .mockResolvedValueOnce(page(1, ['c', 'd']))
        .mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                }),
        )
        .mockResolvedValueOnce(page(1, ['b', 'c'], 5));
    const { result } = renderHook(() => useInfinitePersonData('wall', load));
    await waitFor(() => expect(result.current.data).toBeDefined());
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.data?.items).toHaveLength(4));
    act(() => result.current.refresh());
    expect(result.current.refreshing).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.data?.items.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
    act(() => result.current.loadMore());
    expect(load).toHaveBeenCalledTimes(3);
    await act(async () => finish?.(page(0, ['new', 'a'], 5)));
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(load.mock.calls.map((call) => call[0])).toEqual([0, 1, 0, 1]);
    expect(result.current.data?.items.map((item) => item.id)).toEqual(['new', 'a', 'b', 'c']);
    expect(result.current.hasMore).toBe(true);
});

it('keeps the visible list after a refresh error and retries without skeletons', async () => {
    const load = vi
        .fn()
        .mockResolvedValueOnce(page(0, ['a', 'b']))
        .mockRejectedValueOnce(new Error('Offline'))
        .mockResolvedValueOnce(page(0, ['updated'], 1));
    const { result } = renderHook(() => useInfinitePersonData('wall', load));
    await waitFor(() => expect(result.current.data).toBeDefined());
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.error).toBe('UNAVAILABLE'));
    expect(result.current.data?.items).toHaveLength(2);
    expect(result.current.loading).toBe(false);
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.data?.items[0].id).toBe('updated'));
    expect(result.current.error).toBeUndefined();
});

it('retains data for a rating revision but isolates data when sorting changes', async () => {
    const load = vi.fn().mockResolvedValue(page(0, ['original']));
    const { result, rerender } = renderHook(({ sort, revision }) => useInfinitePersonData(sort, load, revision), {
        initialProps: { sort: 'new', revision: 0 },
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
    load.mockImplementation(() => new Promise(() => {}));
    rerender({ sort: 'new', revision: 1 });
    expect(result.current.data?.items[0].id).toBe('original');
    expect(result.current.loading).toBe(false);
    rerender({ sort: 'old', revision: 1 });
    expect(result.current.data).toBeUndefined();
    expect(result.current.loading).toBe(true);
});

it('appends pages, deduplicates overlapping results and stops at the last page', async () => {
    const load = vi
        .fn()
        .mockResolvedValueOnce(page(0, ['a', 'b']))
        .mockResolvedValueOnce(page(1, ['b', 'c']));
    const { result } = renderHook(() => useInfinitePersonData('wall', load));
    await waitFor(() => expect(result.current.data?.items).toHaveLength(2));
    act(() => {
        result.current.loadMore();
        result.current.loadMore();
    });
    await waitFor(() => expect(result.current.hasMore).toBe(false));
    expect(load).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenLastCalledWith(1, expect.any(AbortSignal));
    expect(result.current.data?.items.map((item) => item.id)).toEqual(['a', 'b', 'c']);
});

it('preserves loaded comments after a failed next page and retries the same page', async () => {
    const load = vi
        .fn()
        .mockResolvedValueOnce(page(0, ['a', 'b']))
        .mockRejectedValueOnce(new Error('Offline'))
        .mockResolvedValueOnce(page(1, ['c', 'd']));
    const { result } = renderHook(() => useInfinitePersonData('wall', load));
    await waitFor(() => expect(result.current.data).toBeDefined());
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.moreError).toBe('UNAVAILABLE'));
    expect(result.current.data?.items).toHaveLength(2);
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.data?.items).toHaveLength(4));
    expect(load.mock.calls.map((call) => call[0])).toEqual([0, 1, 1]);
    expect(result.current.moreError).toBeUndefined();
});

it('cancels previous requests and discards stale pages when the person changes', async () => {
    let finish: ((value: ReturnType<typeof page>) => void) | undefined;
    const load = vi
        .fn()
        .mockResolvedValueOnce(page(0, ['a', 'b']))
        .mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                }),
        )
        .mockResolvedValueOnce(page(0, ['new'], 1));
    const { result, rerender } = renderHook(({ person }) => useInfinitePersonData(person, load), {
        initialProps: { person: 'old' },
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
    act(() => result.current.loadMore());
    const signal = load.mock.calls[1][1] as AbortSignal;
    rerender({ person: 'new' });
    await waitFor(() => expect(result.current.data?.items[0].id).toBe('new'));
    expect(signal.aborted).toBe(true);
    await act(async () => finish?.(page(1, ['stale'])));
    expect(result.current.data?.items.map((item) => item.id)).toEqual(['new']);
});

it('loads automatically at the scroll sentinel and displays the branded loader while waiting', async () => {
    let intersection: IntersectionObserverCallback | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
        'IntersectionObserver',
        class {
            constructor(callback: IntersectionObserverCallback) {
                intersection = callback;
            }
            observe = vi.fn();
            disconnect = disconnect;
        },
    );
    const loadMore = vi.fn();
    const view = renderUi(<InfiniteFeedLoader hasMore loadingMore={false} loadMore={loadMore} />);
    expect(screen.queryByRole('button', { name: 'Загрузить ещё' })).not.toBeInTheDocument();
    act(() => intersection?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(loadMore).toHaveBeenCalledOnce();
    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    renderUi(<InfiniteFeedLoader hasMore loadingMore loadMore={loadMore} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status').querySelector('img')).toHaveAttribute('src', '/media/logo.svg?v=vadim-v1');
});

it.each([
    [1, 'bad'],
    [2, 'poor'],
    [3, 'average'],
    [4, 'good'],
    [5, 'great'],
] as const)('uses the appropriate color for rating %s', (value, tone) => {
    renderUi(<RatingValue value={value} count={1} />);
    expect(screen.getByText(`${value.toFixed(1)} / 5`)).toHaveAttribute('data-tone', tone);
});

it('shows an empty rating without assigning it a negative color', () => {
    renderUi(<RatingValue value={0} count={0} />);
    expect(screen.getByText('—')).toHaveAttribute('data-tone', 'empty');
});
