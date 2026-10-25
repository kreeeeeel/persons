import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { SessionToken } from '@persons/id-client';
import { clearSession, saveSession } from '@/shared/auth/session';

const mocks = vi.hoisted(() => ({ set: vi.fn(), remove: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ set: mocks.set, delete: mocks.remove }) }));
vi.mock('@/shared/config/server', () => ({
    getServerConfig: () => ({
        secureCookies: true,
        sessionCookieDomain: process.env.SESSION_COOKIE_DOMAIN || undefined,
    }),
}));

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SESSION_COOKIE_DOMAIN', 'people.test');
});
afterEach(() => vi.unstubAllEnvs());

it('issues a shared HttpOnly session and keeps the registration grant host-only', async () => {
    const expiresAt = new Date('2027-01-01T00:00:00Z');
    await saveSession({ token: 'test-session', expiresAt } as SessionToken);
    expect(mocks.set).toHaveBeenCalledExactlyOnceWith('PERSONS_SESSION', 'test-session', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        domain: 'people.test',
        expires: expiresAt,
    });
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith('PERSONS_GRANT');
});

it.each(['people.test', ''])('expires the session with the same path and domain: %s', async (domain) => {
    vi.stubEnv('SESSION_COOKIE_DOMAIN', domain);
    await clearSession();
    expect(mocks.set).toHaveBeenCalledExactlyOnceWith('PERSONS_SESSION', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        domain: domain || undefined,
        expires: new Date(0),
        maxAge: 0,
    });
    expect(mocks.remove).not.toHaveBeenCalled();
});
