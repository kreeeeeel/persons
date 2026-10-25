import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { preloadImage } from '@persons/ui/loading/preloadImages';
import { IMAGE_PRELOAD_TIMEOUT_MS, usePreloadedImages } from '@persons/ui/loading/usePreloadedImages';

let images: MockImage[];

class MockImage {
    src = '';
    decoding = '';
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    decode = vi.fn().mockResolvedValue(undefined);

    constructor() {
        images.push(this);
    }
}

beforeEach(() => {
    images = [];
    vi.useFakeTimers();
    vi.stubGlobal('Image', MockImage);
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

it('waits for all illustrations and decoding, then reuses loaded images on later visits', async () => {
    const sources = ['/preload-all-1.webp', '/preload-all-2.webp'];
    const first = renderHook(() => usePreloadedImages(sources));
    expect(first.result.current).toBe(false);
    expect(images).toHaveLength(2);
    await act(async () => images[0].onload?.());
    expect(first.result.current).toBe(false);
    await act(async () => images[1].onload?.());
    expect(first.result.current).toBe(true);
    first.unmount();
    const second = renderHook(() => usePreloadedImages(sources));
    await act(async () => {});
    expect(second.result.current).toBe(true);
    expect(images).toHaveLength(2);
});

it('releases the page on a failed image and allows retrying that asset', async () => {
    const src = '/preload-retry.webp';
    const view = renderHook(() => usePreloadedImages([src]));
    await act(async () => images[0].onerror?.());
    expect(view.result.current).toBe(true);
    const retry = preloadImage(src);
    expect(images).toHaveLength(2);
    images[1].onload?.();
    await expect(retry).resolves.toBeUndefined();
});

it('has a bounded waiting time on a slow network and does not preload before enabled', async () => {
    const view = renderHook(({ enabled }) => usePreloadedImages(['/preload-timeout.webp'], enabled), {
        initialProps: { enabled: false },
    });
    expect(images).toHaveLength(0);
    expect(view.result.current).toBe(false);
    view.rerender({ enabled: true });
    await act(async () => vi.advanceTimersByTime(IMAGE_PRELOAD_TIMEOUT_MS - 1));
    expect(view.result.current).toBe(false);
    await act(async () => vi.advanceTimersByTime(1));
    expect(view.result.current).toBe(true);
    view.unmount();
    await act(async () => images[0].onload?.());
});
