import { cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { InfiniteFeedLoader } from '@persons/person-domain/InfiniteFeedLoader';
import { renderUi } from '@test/render';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

it('disconnects automatic pagination while an inactive history keeps its layout', () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
        'IntersectionObserver',
        vi.fn(function () {
            return { observe, disconnect };
        }),
    );
    const loadMore = vi.fn();
    const view = renderUi(<InfiniteFeedLoader hasMore loadingMore={false} loadMore={loadMore} />);
    expect(observe).toHaveBeenCalledTimes(1);
    const sentinel = view.container.firstElementChild;
    view.rerender(<InfiniteFeedLoader hasMore loadingMore={false} loadMore={loadMore} active={false} />);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledTimes(1);
    expect(view.container.firstElementChild).toBe(sentinel);
    expect(loadMore).not.toHaveBeenCalled();
});
