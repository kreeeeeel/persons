import { beforeEach, expect, it, vi } from 'vitest';
import { accountAccess, guardAccount } from '@/modules/account/server/access';

const mocks = vi.hoisted(() => ({ has: vi.fn(), path: vi.fn(), access: vi.fn(), redirect: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
    cookies: async () => ({ has: mocks.has }),
    headers: async () => ({ get: mocks.path }),
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/shared/api/person', () => ({ personApi: async () => ({ restrictions: { getAccessState: mocks.access } }) }));

beforeEach(() => {
    vi.clearAllMocks();
    mocks.has.mockReturnValue(true);
    mocks.path.mockReturnValue('/krel');
});

it('does not call the account service for anonymous visitors', async () => {
    mocks.has.mockReturnValue(false);
    expect(await accountAccess()).toEqual({ signedIn: false });
    expect(mocks.access).not.toHaveBeenCalled();
});

it('redirects a fully blocked user but permits the explanation page', async () => {
    mocks.access.mockResolvedValue({ signedIn: true, restriction: { scopes: ['ACCOUNT'] } });
    await guardAccount('ru');
    expect(mocks.redirect).toHaveBeenCalledWith('/ru/blocked');
    mocks.redirect.mockClear();
    mocks.path.mockReturnValue('/ru/blocked');
    await guardAccount('ru');
    expect(mocks.redirect).not.toHaveBeenCalled();
});

it('leaves partially restricted users on the requested page', async () => {
    mocks.access.mockResolvedValue({ signedIn: true, restriction: { scopes: ['COMMENTS'] } });
    await guardAccount('en');
    expect(mocks.redirect).not.toHaveBeenCalled();
});

it.each(['/ru/privacy', '/ru/terms'])('keeps %s accessible without an account lookup', async (pathname) => {
    mocks.path.mockReturnValue(pathname);
    mocks.access.mockRejectedValue(new Error('unavailable'));
    await guardAccount('ru');
    expect(mocks.access).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
});
