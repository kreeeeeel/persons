import { afterEach, expect, it, vi } from 'vitest';
import { handlePersonRequest } from '@persons/person-domain/api/server';

vi.mock('server-only', () => ({}));
afterEach(() => vi.unstubAllGlobals());

it('forwards feed pagination and viewer identity through the generated client without caching', async () => {
    const result = { items: [], page: 2, size: 12, total: 0 };
    const transport = vi.fn().mockResolvedValue(Response.json(result));
    vi.stubGlobal('fetch', transport);
    const response = await handlePersonRequest(
        new Request('https://people.test/api/person/v1/feed/comments?page=2&size=12'),
        ['v1', 'feed', 'comments'],
        {
            publicUrl: 'https://people.test',
            personUrl: 'http://person.internal',
            serviceToken: 'service',
            sessionToken: 'viewer',
        },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    const [url, options] = transport.mock.calls[0];
    expect(url).toBe('http://person.internal/v1/feed/comments?page=2&size=12');
    expect(options.cache).toBe('no-store');
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer viewer');
    expect(new Headers(options.headers).get('X-Service-Authorization')).toBe('Bearer service');
});
