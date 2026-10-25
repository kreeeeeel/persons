import { beforeEach, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/session/refresh/route';

const mocks = vi.hoisted(() => ({ get: vi.fn(), renew: vi.fn(), save: vi.fn(), error: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: mocks.get }) }));
vi.mock('@/shared/api/server', () => ({
    idApi: async () => ({ refreshSession: mocks.renew }),
    safeError: mocks.error,
}));
vi.mock('@/shared/auth/session', () => ({ saveSession: mocks.save }));
vi.mock('@/shared/config/server', () => ({ getServerConfig: () => ({ publicUrl: 'https://people.test' }) }));

const request = (origin = 'https://people.test') =>
    new Request('https://people.test/api/session/refresh', { method: 'POST', headers: { origin } });

beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockReturnValue({ value: 'old-session' });
    mocks.renew.mockResolvedValue({ token: 'private-session', expiresAt: new Date('2026-12-01T00:00:00Z') });
});

it('saves renewal through the HttpOnly boundary and returns only expiry information', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ expiresAt: '2026-12-01T00:00:00.000Z' });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ token: 'private-session' }), {
        clearRegistrationGrant: false,
    });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
});

it('rejects cross-origin requests and skips anonymous visitors', async () => {
    expect((await POST(request('https://other.test'))).status).toBe(403);
    mocks.get.mockReturnValue(undefined);
    expect((await POST(request())).status).toBe(204);
    expect(mocks.renew).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
});

it('does not overwrite a newer cookie from another tab when the token did not rotate', async () => {
    mocks.get.mockReturnValue({ value: 'private-session' });
    expect((await POST(request())).status).toBe(200);
    expect(mocks.save).not.toHaveBeenCalled();
});

it.each([
    ['UNAUTHORIZED', 401],
    ['UNAVAILABLE', 503],
])('returns %s without changing the cookie on failure', async (code, status) => {
    mocks.renew.mockRejectedValue(new Error('upstream unavailable'));
    mocks.error.mockResolvedValue(code);
    const response = await POST(request());
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ code });
    expect(mocks.save).not.toHaveBeenCalled();
});
