import { beforeEach, expect, it, vi } from 'vitest';
import { ResponseError } from '@persons/id-client';
import { signOut } from '@/modules/account/actions/signOut';

const mocks = vi.hoisted(() => ({ has: vi.fn(), remove: vi.fn(), list: vi.fn(), revoke: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ has: mocks.has, delete: mocks.remove }) }));
vi.mock('@/shared/auth/session', () => ({ clearSession: mocks.remove }));
vi.mock('@/shared/api/server', () => ({
    idApi: async () => ({ listSessions: mocks.list, revokeSession: mocks.revoke }),
}));

beforeEach(() => {
    vi.clearAllMocks();
    mocks.has.mockReturnValue(true);
    mocks.revoke.mockResolvedValue(undefined);
});

it('revokes only the current session and then deletes the cookie', async () => {
    mocks.list.mockResolvedValue({
        items: [
            { id: 'other', current: false },
            { id: 'current', current: true },
        ],
    });

    expect(await signOut()).toEqual({ ok: true });
    expect(mocks.revoke).toHaveBeenCalledExactlyOnceWith({ id: 'current' });
    expect(mocks.remove).toHaveBeenCalledOnce();
});

it('clears an expired session cookie without an error', async () => {
    mocks.list.mockRejectedValue(new ResponseError(new Response(null, { status: 401 })));

    expect(await signOut()).toEqual({ ok: true });
    expect(mocks.remove).toHaveBeenCalledOnce();
});

it('keeps the cookie when revocation fails so the user can retry', async () => {
    mocks.list.mockRejectedValue(new Error('backend unavailable'));

    expect(await signOut()).toEqual({ ok: false });
    expect(mocks.remove).not.toHaveBeenCalled();
});
