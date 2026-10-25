import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PersonSearchPage } from '@persons/person-client';
import { usePersonSearch } from '@persons/person-domain/hooks/usePersonSearch';

const search = vi.hoisted(() => vi.fn());
vi.mock('@persons/person-domain/api/browser', () => ({ personClient: { persons: { searchPersons: search } } }));
const empty: PersonSearchPage = { items: [], total: 0, page: 0, size: 8 };

beforeEach(() => {
    vi.useFakeTimers();
    search.mockReset();
    search.mockResolvedValue(empty);
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

it('waits for a typing pause, skips short queries and cancels obsolete timers', async () => {
    const hook = renderHook(({ value }) => usePersonSearch(value), { initialProps: { value: 'В' } });
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(search).not.toHaveBeenCalled();
    hook.rerender({ value: 'Ва' });
    expect(hook.result.current.loading).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(200));
    hook.rerender({ value: 'Вадим' });
    await act(() => vi.advanceTimersByTimeAsync(349));
    expect(search).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(search).toHaveBeenCalledOnce();
    expect(search.mock.calls[0][0].q).toBe('Вадим');
    expect(hook.result.current.result).toEqual(empty);
    expect(hook.result.current.loading).toBe(false);
});

it('ignores a slow obsolete response even if the transport completes after abort', async () => {
    let finish: (page: PersonSearchPage) => void = () => undefined;
    search.mockImplementationOnce(
        () =>
            new Promise<PersonSearchPage>((resolve) => {
                finish = resolve;
            }),
    );
    const hook = renderHook(({ value }) => usePersonSearch(value), { initialProps: { value: 'старый' } });
    await act(() => vi.advanceTimersByTimeAsync(350));
    const signal = search.mock.calls[0][1].signal as AbortSignal;
    hook.rerender({ value: 'новый' });
    expect(signal.aborted).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(350));
    await act(async () => finish({ ...empty, total: 99 }));
    expect(hook.result.current.result?.total).toBe(0);
});

it('shows a retryable failure and resets results when cleared', async () => {
    search.mockRejectedValueOnce(new Error('offline'));
    const hook = renderHook(({ value }) => usePersonSearch(value), { initialProps: { value: 'крел' } });
    await act(() => vi.advanceTimersByTimeAsync(350));
    expect(hook.result.current.failed).toBe(true);
    act(() => hook.result.current.retry());
    await act(() => vi.advanceTimersByTimeAsync(350));
    expect(hook.result.current.failed).toBe(false);
    hook.rerender({ value: '' });
    expect(hook.result.current.enabled).toBe(false);
    expect(hook.result.current.result).toBeUndefined();
});
