import { render, cleanup, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SessionRefresh } from '@persons/ui/auth/SessionRefresh';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

it('renews on mount and periodically with same-origin cookies while suppressing focus bursts', async () => {
    vi.useFakeTimers();
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', request);
    render(<SessionRefresh />);
    await act(async () => {
        await Promise.resolve();
    });
    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith(
        '/api/session/refresh',
        expect.objectContaining({ method: 'POST', credentials: 'same-origin', cache: 'no-store' }),
    );
    window.dispatchEvent(new Event('focus'));
    expect(request).toHaveBeenCalledOnce();
    await act(async () => {
        vi.advanceTimersByTime(30 * 60 * 1000);
    });
    expect(request).toHaveBeenCalledTimes(2);
});
