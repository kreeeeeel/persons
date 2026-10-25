import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { usePersonMutation } from '@persons/person-domain/hooks/usePersonMutation';

vi.mock('@persons/person-domain/api/browser', () => ({
    personError: async () => 'UNAVAILABLE',
}));
afterEach(cleanup);

it('distinguishes automatic publication from pending moderation without remounting the page', async () => {
    const { result } = renderHook(usePersonMutation);
    const saved = vi.fn();
    await act(async () => result.current.run(async () => ({ status: 'APPROVED' }), saved));
    expect(result.current.published).toBe(true);
    expect(result.current.notice).toBe(false);
    expect(saved).toHaveBeenCalledOnce();
    await act(async () => result.current.run(async () => ({ status: 'PENDING' })));
    expect(result.current.published).toBe(false);
    expect(result.current.notice).toBe(true);
    await act(async () =>
        result.current.run(async () => {
            throw new Error('offline');
        }),
    );
    expect(result.current.error).toBe('UNAVAILABLE');
    expect(result.current.notice).toBe(false);
    expect(result.current.published).toBe(false);
});

it('does not show publication feedback for ordinary settings updates', async () => {
    const { result } = renderHook(usePersonMutation);
    await act(async () => result.current.run(async () => ({ forceModeration: true }), undefined, false));
    expect(result.current.notice).toBe(false);
    expect(result.current.published).toBe(false);
});
