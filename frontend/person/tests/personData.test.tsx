import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { usePersonData } from '@persons/person-domain/hooks/usePersonData';
import { notifyAccountProfileChanged } from '@persons/person-domain/account/profileChanges';

vi.mock('@persons/person-domain/api/browser', () => ({ personError: async () => 'UNAVAILABLE' }));
afterEach(cleanup);

it('refreshes current author details after an account photo changes while preserving visible data', async () => {
    const load = vi.fn().mockResolvedValue({ authorName: 'Система', authorAvatarUrl: '/avatar?v=2' });
    const initial = { authorName: 'Система', authorAvatarUrl: '/avatar?v=1' };
    const { result } = renderHook(() => usePersonData('media', load, initial));
    act(notifyAccountProfileChanged);
    expect(result.current.data).toBe(initial);
    expect(result.current.loading).toBe(false);
    await waitFor(() => expect(result.current.data?.authorAvatarUrl).toBe('/avatar?v=2'));
    expect(load).toHaveBeenCalledOnce();
});

it('uses the server snapshot and refreshes profile statistics without hiding the content', async () => {
    const snapshot = { name: 'Крел', average: 3 };
    let finish: ((value: typeof snapshot) => void) | undefined;
    const load = vi.fn(
        () =>
            new Promise<typeof snapshot>((resolve) => {
                finish = resolve;
            }),
    );
    const { result } = renderHook(() => usePersonData('krel', load, snapshot));
    expect(result.current.data).toBe(snapshot);
    expect(load).not.toHaveBeenCalled();
    act(() => result.current.refresh());
    expect(result.current.loading).toBe(false);
    expect(result.current.refreshing).toBe(true);
    expect(result.current.data).toBe(snapshot);
    await act(async () => finish?.({ name: 'Крел', average: 5 }));
    expect(result.current.data?.average).toBe(5);
    expect(result.current.refreshing).toBe(false);
});

it('preserves loaded CMS content on a failed refresh and retries', async () => {
    const load = vi
        .fn<() => Promise<{ average: number }>>()
        .mockResolvedValueOnce({ average: 3 })
        .mockRejectedValueOnce(new Error('Offline'))
        .mockResolvedValueOnce({ average: 5 });
    const { result } = renderHook(() => usePersonData('krel', load));
    await waitFor(() => expect(result.current.data?.average).toBe(3));
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.error).toBe('UNAVAILABLE'));
    expect(result.current.data?.average).toBe(3);
    expect(result.current.loading).toBe(false);
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.data?.average).toBe(5));
    expect(result.current.error).toBeUndefined();
});
