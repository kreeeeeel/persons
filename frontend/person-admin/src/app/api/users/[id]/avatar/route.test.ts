import { Blob } from 'node:buffer';
import { beforeEach, expect, it, vi } from 'vitest';
import { ResponseError } from '@persons/person-client';
import { GET } from '@/app/api/users/[id]/avatar/route';

const api = vi.hoisted(() => ({ currentUser: vi.fn(), avatar: vi.fn(), safeError: vi.fn() }));
vi.mock('@/modules/account/server/currentUser', () => ({ currentUser: api.currentUser }));
vi.mock('@/shared/api/server', () => ({
    safeError: api.safeError,
}));
vi.mock('@/modules/users/server/api', () => ({
    adminApi: async () => ({ getAdminUserAvatar: api.avatar }),
}));

const USER_ID = '11111111-1111-4111-8111-111111111111';

function get(id = USER_ID) {
    return GET(new Request(`http://localhost/api/users/${id}/avatar`), { params: Promise.resolve({ id }) });
}

beforeEach(() => {
    vi.resetAllMocks();
    api.currentUser.mockResolvedValue({ role: 'ADMIN' });
});

it('returns the selected account avatar privately for an administrator', async () => {
    api.avatar.mockResolvedValue(new Blob(['avatar'], { type: 'image/jpeg' }));
    const response = await get();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('avatar');
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(api.avatar).toHaveBeenCalledExactlyOnceWith({ id: USER_ID });
});

it.each([
    [null, 401],
    [{ role: 'USER' }, 403],
])('denies avatar access without administrator rights: %s', async (user, status) => {
    api.currentUser.mockResolvedValue(user);
    const response = await get();
    expect(response.status).toBe(status);
    expect(api.avatar).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toBe('private, no-store');
});

it('rejects an invalid account identifier before contacting the backend', async () => {
    expect((await get('invalid')).status).toBe(400);
    expect(api.avatar).not.toHaveBeenCalled();
});

it.each([401, 403, 404])('preserves upstream access and absent avatar responses: %s', async (status) => {
    api.avatar.mockRejectedValue(new ResponseError(new Response(null, { status })));
    const response = await get();
    expect(response.status).toBe(status);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
});

it('reports an unavailable account service without exposing its error', async () => {
    api.avatar.mockRejectedValue(new Error('upstream detail'));
    const response = await get();
    expect(response.status).toBe(503);
    expect(await response.text()).toBe('');
    expect(api.safeError).toHaveBeenCalledOnce();
});
