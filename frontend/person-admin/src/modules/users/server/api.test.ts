import { afterEach, expect, it, vi } from 'vitest';
import { adminApi } from '@/modules/users/server/api';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => new Map([['PERSONS_SESSION', { value: 'admin-session' }]]) }));
vi.mock('@/shared/config/server', () => ({
    getServerConfig: () => ({ personUrl: 'http://gateway.internal/person', internalJwtSecret: 'test-secret' }),
}));
vi.mock('@/shared/api/internal-token', () => ({ issueServiceToken: () => 'service-token' }));

afterEach(() => vi.unstubAllGlobals());

it('loads account avatar bytes through the authenticated gateway administrator API', async () => {
    const bytes = new Uint8Array([255, 216, 1, 2, 255, 217]);
    const transport = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(bytes, { headers: { 'content-type': 'image/jpeg' } }));
    vi.stubGlobal('fetch', transport);
    const id = '11111111-1111-4111-8111-111111111111';

    const avatar = await (await adminApi()).getAdminUserAvatar({ id });
    const [url, init] = transport.mock.calls[0];

    expect(String(url)).toBe(`http://gateway.internal/person/v1/admin/users/${id}/avatar`);
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer admin-session');
    expect(new Headers(init?.headers).get('x-service-authorization')).toBe('Bearer service-token');
    expect(init?.cache).toBe('no-store');
    expect(new Uint8Array(await avatar.arrayBuffer())).toEqual(bytes);
});
