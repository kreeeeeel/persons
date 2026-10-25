import { beforeEach, expect, it, vi } from 'vitest';
import { listAccountSessions, endAccountSession, endOtherAccountSessions } from '@/modules/account/actions/sessions';

const mocks = vi.hoisted(() => ({ list: vi.fn(), revoke: vi.fn(), others: vi.fn(), deleteCookie: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ delete: mocks.deleteCookie }) }));
vi.mock('@/shared/auth/session', () => ({ clearSession: mocks.deleteCookie }));
vi.mock('@/shared/api/server', () => ({
    idApi: async () => ({ listSessions: mocks.list, revokeSession: mocks.revoke, revokeOtherSessions: mocks.others }),
    safeError: async () => 'UNAVAILABLE',
}));
const id = 'f19b7647-e499-44cb-a171-8b832025b344';

beforeEach(() => {
    vi.clearAllMocks();
    mocks.revoke.mockResolvedValue(undefined);
});

it('validates ownership using the current account session list and ignores unknown ids', async () => {
    expect((await endAccountSession('invalid')).ok).toBe(false);
    expect(mocks.list).not.toHaveBeenCalled();
    mocks.list.mockResolvedValue({ items: [] });
    expect((await endAccountSession(id)).ok).toBe(false);
    expect(mocks.revoke).not.toHaveBeenCalled();
});

it('clears the cookie only when the backend identifies the revoked session as current', async () => {
    mocks.list.mockResolvedValue({ items: [{ id, current: false }] });
    await endAccountSession(id);
    expect(mocks.deleteCookie).not.toHaveBeenCalled();
    mocks.list.mockResolvedValue({ items: [{ id, current: true }] });
    expect(await endAccountSession(id)).toEqual({ ok: true, data: { current: true } });
    expect(mocks.deleteCookie).toHaveBeenCalledOnce();
});

it('serializes session timestamps and keeps the current cookie when ending other devices', async () => {
    const date = new Date('2026-10-17T10:00:00Z');
    mocks.list.mockResolvedValue({ items: [{ id, createdAt: date, lastSeenAt: date, expiresAt: date }] });
    const result = await listAccountSessions();
    expect(result.ok && result.data[0].createdAt).toBe(date.toISOString());
    mocks.others.mockResolvedValue(undefined);
    expect((await endOtherAccountSessions()).ok).toBe(true);
    expect(mocks.deleteCookie).not.toHaveBeenCalled();
});
