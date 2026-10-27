import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { handlePersonRequest } from '@persons/person-domain/api/server';

vi.mock('server-only', () => ({}));
const config = {
    personUrl: 'http://person.internal',
    publicUrl: 'https://people.example',
    serviceToken: 'service-secret',
    sessionToken: 'private-session',
};
const id = 'b4b00d6a-e38b-4d16-820c-80209aecfb15';
const transport = vi.fn<typeof fetch>();

it.each(['authors/by-handle/friend', `authors/by-handle/${id}`, 'publications/by-author/friend', 'tag-definitions'])(
    'forwards public author and glossary routes through generated clients: %s',
    async (route) => {
        transport.mockResolvedValue(
            Response.json(
                route.startsWith('authors/')
                    ? { id, handle: 'friend', fullName: 'Friend' }
                    : route === 'tag-definitions'
                      ? []
                      : { items: [], page: 2, size: 12, total: 0 },
            ),
        );
        const response = await handlePersonRequest(
            new Request(`https://people.example/api/person/v1/${route}?page=2&size=12&kind=COMMENT`),
            ['v1', ...route.split('/')],
            { ...config, sessionToken: undefined },
        );
        expect(response.status).toBe(200);
        const upstream = new URL(String(transport.mock.calls[0][0]));
        expect(upstream.pathname).toBe(`/v1/${route}`);
        if (route.startsWith('publications/')) {
            expect(upstream.searchParams.get('page')).toBe('2');
            expect(upstream.searchParams.get('kind')).toBe('COMMENT');
        }
        expect(new Headers(transport.mock.calls[0][1]?.headers).get('Authorization')).toBeNull();
    },
);

it.each([
    ['persons/directory', 'order=RATING'],
    ['feed', 'kind=WALL'],
])('forwards real community pagination and filters without caching: %s', async (route, filter) => {
    transport.mockResolvedValue(
        new Response('{"items":[],"total":0,"page":5,"size":12}', { headers: { 'content-type': 'application/json' } }),
    );
    const response = await handlePersonRequest(
        new Request(`https://people.example/api/person/v1/${route}?page=5&size=12&${filter}`),
        ['v1', ...route.split('/')],
        config,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const upstream = new URL(String(transport.mock.calls[0][0]));
    expect(upstream.pathname).toBe(`/v1/${route}`);
    expect(upstream.searchParams.get('page')).toBe('5');
    const [key, value] = filter.split('=');
    expect(upstream.searchParams.get(key)).toBe(value);
});

it('forwards private publication filters and session without accepting a client supplied author', async () => {
    transport.mockResolvedValue(
        new Response('{"items":[],"total":0,"page":2,"size":12}', {
            headers: { 'content-type': 'application/json' },
        }),
    );
    const response = await handlePersonRequest(
        new Request(
            'https://people.example/api/person/v1/publications/mine?kind=COMMENT&q=Вадим&page=2&size=12&authorId=other',
        ),
        ['v1', 'publications', 'mine'],
        config,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const upstream = new URL(String(transport.mock.calls[0][0]));
    expect(upstream.pathname).toBe('/v1/publications/mine');
    expect(upstream.searchParams.get('kind')).toBe('COMMENT');
    expect(upstream.searchParams.get('q')).toBe('Вадим');
    expect(upstream.searchParams.get('page')).toBe('2');
    expect(upstream.searchParams.has('authorId')).toBe(false);
    expect(new Headers(transport.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer private-session');
});

it.each([`persons/${id}/games/dota2/matches`, 'games/dota2/events'])(
    'forwards game history and feed pagination: %s',
    async (route) => {
        transport.mockResolvedValue(
            new Response('{"items":[],"page":2,"size":12,"total":0}', {
                headers: { 'content-type': 'application/json' },
            }),
        );
        const response = await handlePersonRequest(
            new Request(`https://people.example/api/person/v1/${route}?page=2&size=12`),
            ['v1', ...route.split('/')],
            config,
        );
        expect(response.status).toBe(200);
        expect(String(transport.mock.calls[0][0])).toBe(`http://person.internal/v1/${route}?page=2&size=12`);
    },
);

it.each([`persons/${id}/games/dota2/matches/8000000001`, `persons/${id}/games/cs2/matches/${id}`])(
    'forwards a direct match link through the generated client with the session: %s',
    async (route) => {
        transport.mockResolvedValue(Response.json({ id }));
        const response = await handlePersonRequest(
            new Request(`https://people.example/api/person/v1/${route}`),
            ['v1', ...route.split('/')],
            config,
        );
        expect(response.status).toBe(200);
        const [url, init] = transport.mock.calls[0];
        expect(String(url)).toBe(`http://person.internal/v1/${route}`);
        expect(new Headers(init?.headers).get('authorization')).toBe('Bearer private-session');
        expect(response.headers.get('cache-control')).toBe('private, no-store');
    },
);

it.each([`persons/${id}/games/dota2/matches/not-a-match`, `persons/${id}/games/cs2/matches/8000000001`])(
    'rejects malformed direct match routes without an upstream request: %s',
    async (route) => {
        const response = await handlePersonRequest(
            new Request(`https://people.example/api/person/v1/${route}`),
            ['v1', ...route.split('/')],
            config,
        );
        expect(response.status).toBe(404);
        expect(transport).not.toHaveBeenCalled();
    },
);

it.each(['site-settings', 'admin/site-settings'])('reads interface settings without caching: %s', async (path) => {
    transport.mockResolvedValue(
        new Response('{"marqueeEnabled":false}', { headers: { 'content-type': 'application/json' } }),
    );
    const response = await handlePersonRequest(
        new Request(`https://people.example/api/person/v1/${path}`),
        ['v1', ...path.split('/')],
        { ...config, sessionToken: path.startsWith('admin/') ? config.sessionToken : undefined },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ marqueeEnabled: false });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(String(transport.mock.calls[0][0])).toBe(`http://person.internal/v1/${path}`);
});

it('forwards an exact admin person lookup through the authenticated generated client', async () => {
    transport.mockResolvedValue(
        new Response(
            JSON.stringify({
                id,
                tag: 'friend',
                fullName: 'Friend',
                published: true,
                pendingChanges: 0,
                ownerAccountId: 'owner',
            }),
            { headers: { 'content-type': 'application/json' } },
        ),
    );
    const response = await handlePersonRequest(
        new Request(`https://people.example/api/person/v1/admin/persons/${id}`),
        ['v1', 'admin', 'persons', id],
        config,
    );
    expect(response.status).toBe(200);
    const [url, init] = transport.mock.calls[0];
    expect(String(url)).toBe(`http://person.internal/v1/admin/persons/${id}`);
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer private-session');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect((await response.json()).ownerAccountId).toBe('owner');
});

it('proxies current author avatars through the generated client without caching account images', async () => {
    transport.mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } }));
    const response = await handlePersonRequest(
        new Request(`https://people.example/api/person/v1/authors/${id}/avatar?v=2`),
        ['v1', 'authors', id, 'avatar'],
        { ...config, sessionToken: undefined },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    const [url, init] = transport.mock.calls[0];
    expect(String(url)).toBe(`http://person.internal/v1/authors/${id}/avatar`);
    expect(new Headers(init?.headers).get('x-service-authorization')).toBe('Bearer service-secret');
});

it('forwards the user list search and page through the authenticated account client', async () => {
    transport.mockResolvedValue(
        new Response('{"items":[],"page":1,"size":20,"total":0}', { headers: { 'content-type': 'application/json' } }),
    );
    const response = await handlePersonRequest(
        new Request('https://people.example/api/person/v1/admin/users?page=1&size=20&search=Vadim'),
        ['v1', 'admin', 'users'],
        config,
    );
    expect(response.status).toBe(200);
    const [url, init] = transport.mock.calls[0];
    expect(new URL(String(url)).searchParams.get('search')).toBe('Vadim');
    expect(new URL(String(url)).searchParams.get('page')).toBe('1');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer private-session');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
});

it.each([
    { parts: ['v1', 'admin', 'site-settings'], body: { marqueeEnabled: false } },
    {
        parts: ['v1', 'admin', 'publication-settings'],
        body: {
            commentsRequireModeration: false,
            photosRequireModeration: true,
            momentsRequireModeration: false,
            reviewsRequireModeration: true,
            loansRequireModeration: false,
            pagesRequireModeration: true,
            profileChangesRequireModeration: false,
            avatarsRequireModeration: true,
        },
    },
    { parts: ['v1', 'admin', 'users', id, 'moderation-settings'], body: { forceModeration: true } },
])('forwards publication settings through the authenticated generated client: $parts', async ({ parts, body }) => {
    transport.mockImplementation(
        async () => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } }),
    );
    const route = parts.join('/');
    const response = await handlePersonRequest(
        new Request(`https://people.example/api/person/${route}`, {
            method: 'PUT',
            headers: { origin: config.publicUrl, 'content-type': 'application/json' },
            body: JSON.stringify(body),
        }),
        parts,
        config,
    );
    expect(response.status).toBe(200);
    const [url, init] = transport.mock.calls[0];
    expect(String(url)).toBe(`http://person.internal/${route}`);
    expect(JSON.parse(String(init?.body))).toEqual(body);
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer private-session');
    const denied = await handlePersonRequest(
        new Request(`https://people.example/api/person/${route}`, {
            method: 'PUT',
            headers: { origin: 'https://foreign.example' },
            body: JSON.stringify(body),
        }),
        parts,
        config,
    );
    expect(denied.status).toBe(403);
    expect(transport).toHaveBeenCalledTimes(1);
});

it.each(['COMMENT', 'RATING', 'LOAN', 'MEDIA'])('does not proxy removed %s reaction author endpoints', async (kind) => {
    const parts = kind === 'MEDIA' ? ['v1', 'media', id, 'reactions'] : ['v1', 'content', kind, id, 'reactions'];
    const response = await handlePersonRequest(
        new Request(`https://people.example/api/person/${parts.join('/')}?reaction=LIKE`),
        parts,
        config,
    );
    expect(response.status).toBe(404);
    expect(transport).not.toHaveBeenCalled();
});

it.each(['comments', 'credit', 'ratings'])(
    'forwards the %s server sort and pagination through the generated client',
    async (feed) => {
        transport.mockResolvedValue(new Response('{"items":[]}', { headers: { 'content-type': 'application/json' } }));
        const response = await handlePersonRequest(
            new Request(`https://people.example/api/person/v1/persons/${id}/${feed}?page=2&size=10&sort=MOST_DISLIKED`),
            ['v1', 'persons', id, feed],
            config,
        );
        expect(response.status).toBe(200);
        const forwarded = new URL(String(transport.mock.calls[0][0]));
        expect(forwarded.searchParams.get('page')).toBe('2');
        expect(forwarded.searchParams.get('size')).toBe('10');
        expect(forwarded.searchParams.get('sort')).toBe('MOST_DISLIKED');
    },
);

it('forwards a dislike and removal through the protected content reaction routes', async () => {
    transport.mockResolvedValue(
        new Response('{"count":0,"liked":false,"dislikes":1,"disliked":true}', {
            headers: { 'content-type': 'application/json' },
        }),
    );
    const response = await handlePersonRequest(
        new Request(`https://people.example/api/person/v1/content/COMMENT/${id}/reaction`, {
            method: 'PUT',
            headers: { origin: config.publicUrl, 'content-type': 'application/json' },
            body: JSON.stringify({ reaction: 'DISLIKE' }),
        }),
        ['v1', 'content', 'COMMENT', id, 'reaction'],
        config,
    );
    expect(response.status).toBe(200);
    const [url, init] = transport.mock.calls[0];
    expect(String(url)).toBe(`http://person.internal/v1/content/COMMENT/${id}/reaction`);
    expect(JSON.parse(String(init?.body))).toEqual({ reaction: 'DISLIKE' });
    await handlePersonRequest(
        new Request(`https://people.example/api/person/v1/content/COMMENT/${id}/reaction`, {
            method: 'DELETE',
            headers: { origin: config.publicUrl },
        }),
        ['v1', 'content', 'COMMENT', id, 'reaction'],
        config,
    );
    expect(transport.mock.calls[1][1]?.method).toBe('DELETE');
});

beforeEach(() => {
    vi.stubGlobal('fetch', transport);
    transport.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

it('replaces an unexpected upstream HTML error with a safe typed error', async () => {
    transport.mockResolvedValue(
        new Response('private server detail', { status: 500, headers: { 'content-type': 'text/html' } }),
    );
    const response = await handlePersonRequest(
        new Request('https://people.example/api/person/v1/persons/search?q=test'),
        ['v1', 'persons', 'search'],
        config,
    );
    expect(await response.json()).toEqual({ code: 'UNAVAILABLE' });
    expect(response.status).toBe(500);
});

it('blocks cross-origin mutations and non-contract routes without forwarding them', async () => {
    const denied = await handlePersonRequest(
        new Request('https://people.example/api/person/v1/persons', {
            method: 'POST',
            headers: { origin: 'https://other.example' },
        }),
        ['v1', 'persons'],
        config,
    );
    expect(denied.status).toBe(403);
    const unknown = await handlePersonRequest(
        new Request('https://people.example/api/person/internal'),
        ['internal'],
        config,
    );
    expect(unknown.status).toBe(404);
    expect(transport).not.toHaveBeenCalled();
});

it('uses the generated client and privately forwards optional account context for public reads', async () => {
    transport.mockResolvedValue(new Response('{"items":[]}', { headers: { 'content-type': 'application/json' } }));
    const response = await handlePersonRequest(
        new Request('https://people.example/api/person/v1/persons/search?q=Вадим'),
        ['v1', 'persons', 'search'],
        config,
    );
    const [url, init] = transport.mock.calls[0];
    expect(String(url)).toContain('http://person.internal/v1/persons/search?');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer private-session');
    expect(new Headers(init?.headers).get('x-service-authorization')).toBe('Bearer service-secret');
    expect(await response.text()).toBe('{"items":[]}');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('authorization')).toBeNull();
});

it('sets its own HttpOnly visitor identity and ignores client-supplied identity', async () => {
    transport.mockResolvedValue(new Response(null, { status: 204 }));
    const request = new Request('https://people.example/api/person/views', {
        method: 'POST',
        headers: { origin: config.publicUrl, cookie: 'PERSONS_OPTIONAL_COOKIES=accepted' },
        body: '{"visitorId":"attacker"}',
    });
    const response = await handlePersonRequest(request, ['v1', 'persons', id, 'views'], config);
    const body = JSON.parse(String(transport.mock.calls[0][1]?.body)) as { visitorId: string };
    expect(body.visitorId).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers.get('set-cookie')).toContain(`PERSONS_VISITOR=${body.visitorId}`);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly; SameSite=Lax');
    expect(response.headers.get('set-cookie')).toContain('; Secure');
});

it.each(['', 'PERSONS_OPTIONAL_COOKIES=rejected'])(
    'does not record views or issue tracking cookies without consent: %s',
    async (cookie) => {
        const request = new Request('https://people.example/api/person/views', {
            method: 'POST',
            headers: { origin: config.publicUrl, cookie },
        });
        const response = await handlePersonRequest(request, ['v1', 'persons', id, 'views'], config);
        expect(response.status).toBe(204);
        expect(response.headers.get('set-cookie')).toBeNull();
        expect(transport).not.toHaveBeenCalled();
    },
);

it('preserves a streaming partial media response and Range headers', async () => {
    transport.mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), {
            status: 206,
            headers: {
                'content-range': 'bytes 1-3/100',
                'content-type': 'video/mp4',
                'content-length': '3',
                'accept-ranges': 'bytes',
            },
        }),
    );
    const response = await handlePersonRequest(
        new Request('https://people.example/api/person/media', { headers: { range: 'bytes=1-3' } }),
        ['v1', 'media', id, 'content'],
        config,
    );
    expect(new Headers(transport.mock.calls[0][1]?.headers).get('range')).toBe('bytes=1-3');
    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe('bytes 1-3/100');
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
});

it('proxies admin session IP inspection with authentication and without caching', async () => {
    transport.mockResolvedValue(
        new Response(JSON.stringify({ items: [{ ip: '203.0.113.7' }] }), {
            headers: { 'content-type': 'application/json' },
        }),
    );
    const response = await handlePersonRequest(
        new Request(`https://people.example/api/person/v1/admin/users/${id}/sessions`),
        ['v1', 'admin', 'users', id, 'sessions'],
        config,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const [url, init] = transport.mock.calls[0];
    expect(String(url)).toBe(`http://person.internal/v1/admin/users/${id}/sessions`);
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer private-session');
    expect((await response.json()).items[0].ip).toBe('203.0.113.7');
});

it('preserves authorization failures from session IP inspection', async () => {
    transport.mockResolvedValue(
        new Response(JSON.stringify({ code: 'FORBIDDEN' }), {
            status: 403,
            headers: { 'content-type': 'application/json' },
        }),
    );
    const response = await handlePersonRequest(
        new Request(`https://people.example/api/person/v1/admin/users/${id}/sessions`),
        ['v1', 'admin', 'users', id, 'sessions'],
        config,
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: 'FORBIDDEN' });
});

it('forwards administrator name changes and rejects cross-origin mutations', async () => {
    const route = `v1/admin/users/${id}/profile`;
    const body = { firstName: 'Ivan', lastName: 'Petrov', patronymic: 'Ivanovich' };
    transport.mockResolvedValue(
        new Response(JSON.stringify({ ...body, id }), { headers: { 'content-type': 'application/json' } }),
    );
    const response = await handlePersonRequest(
        new Request(`https://people.example/api/person/${route}`, {
            method: 'PUT',
            headers: { origin: config.publicUrl, 'content-type': 'application/json' },
            body: JSON.stringify(body),
        }),
        ['v1', 'admin', 'users', id, 'profile'],
        config,
    );
    expect(response.status).toBe(200);
    const [url, init] = transport.mock.calls[0];
    expect(String(url)).toBe('http://person.internal/' + route);
    expect(JSON.parse(String(init?.body))).toEqual(body);
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer private-session');
    const denied = await handlePersonRequest(
        new Request(`https://people.example/api/person/${route}`, {
            method: 'PUT',
            headers: { origin: 'https://foreign.example' },
            body: JSON.stringify(body),
        }),
        ['v1', 'admin', 'users', id, 'profile'],
        config,
    );
    expect(denied.status).toBe(403);
    expect(transport).toHaveBeenCalledOnce();
});

it('forwards the complete moderation and content filters, including dates and exact destination', async () => {
    for (const endpoint of ['moderation', 'content']) {
        transport.mockResolvedValueOnce(
            new Response('{"items":[],"total":0,"page":2,"size":20}', {
                headers: { 'content-type': 'application/json' },
            }),
        );
        const query = `q=Поход&personId=${id}&authorId=${id}&createdFrom=2026-10-20T21:00:00Z&createdTo=2026-10-21T21:00:00Z&order=NEWEST&page=2&size=20&${endpoint === 'content' ? 'kind=PHOTO&status=HIDDEN' : 'type=PHOTO&status=ALL'}`;
        const response = await handlePersonRequest(
            new Request(`https://people.example/api/person/v1/admin/${endpoint}?${query}`),
            ['v1', 'admin', endpoint],
            config,
        );
        expect(response.status).toBe(200);
        const [url, init] = transport.mock.calls.at(-1)!;
        const upstream = new URL(String(url));
        expect(upstream.searchParams.get('personId')).toBe(id);
        expect(upstream.searchParams.get('q')).toBe('Поход');
        expect(upstream.searchParams.get('createdTo')).toBe('2026-10-21T21:00:00.000Z');
        expect(upstream.searchParams.get('status')).toBe(endpoint === 'content' ? 'HIDDEN' : 'ALL');
        expect(new Headers(init?.headers).get('authorization')).toBe('Bearer private-session');
    }
});
it('proxies audited content removal with authentication and rejects a foreign origin', async () => {
    transport.mockResolvedValue(new Response(null, { status: 204 }));
    const path = ['v1', 'admin', 'content', 'PHOTO', id, 'hide'];
    const request = (origin: string) =>
        new Request(`https://people.example/api/person/${path.join('/')}`, {
            method: 'POST',
            headers: { origin },
            body: JSON.stringify({ reason: 'Нарушение' }),
        });
    expect((await handlePersonRequest(request('https://foreign.example'), path, config)).status).toBe(403);
    expect(transport).not.toHaveBeenCalled();
    expect((await handlePersonRequest(request('https://people.example'), path, config)).status).toBe(204);
    expect(String(transport.mock.calls[0][0])).toBe(`http://person.internal/v1/admin/content/PHOTO/${id}/hide`);
    expect(JSON.parse(String(transport.mock.calls[0][1]?.body))).toEqual({ reason: 'Нарушение' });
});

it('forwards scoped restrictions with the subject, destination, expiry and authenticated revocation', async () => {
    const rule = '55555555-5555-4555-8555-555555555555';
    transport.mockResolvedValueOnce(new Response('{"id":"rule"}', { headers: { 'content-type': 'application/json' } }));
    const body = { personId: rule, scopes: ['COMMENTS'], reason: 'Причина', expiresAt: '2027-01-01T00:00:00.000Z' };
    const path = ['v1', 'admin', 'users', id, 'page-restrictions'];
    expect(
        (
            await handlePersonRequest(
                new Request(`https://people.example/api/person/${path.join('/')}`, {
                    method: 'PUT',
                    headers: { origin: 'https://people.example' },
                    body: JSON.stringify(body),
                }),
                path,
                config,
            )
        ).status,
    ).toBe(200);
    expect(JSON.parse(String(transport.mock.calls[0][1]?.body))).toEqual(body);
    transport.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const revoke = [...path, rule];
    expect(
        (
            await handlePersonRequest(
                new Request(`https://people.example/api/person/${revoke.join('/')}`, {
                    method: 'DELETE',
                    headers: { origin: 'https://people.example' },
                }),
                revoke,
                config,
            )
        ).status,
    ).toBe(204);
    expect(String(transport.mock.calls[1][0])).toBe(`http://person.internal/${revoke.join('/')}`);
    expect(new Headers(transport.mock.calls[1][1]?.headers).get('authorization')).toBe('Bearer private-session');
});

it('forwards active restriction paging and achievement search through authenticated generated clients', async () => {
    for (const endpoint of ['blocked-users', 'page-restrictions', 'achievements']) {
        transport.mockResolvedValueOnce(
            new Response('{"items":[],"total":0,"page":1,"size":20}', {
                headers: { 'content-type': 'application/json' },
            }),
        );
        const path = ['v1', 'admin', endpoint];
        const response = await handlePersonRequest(
            new Request(`https://people.example/api/person/${path.join('/')}?page=1&size=20&q=100%25&userId=${id}`),
            path,
            config,
        );
        expect(response.status).toBe(200);
        const [url, init] = transport.mock.calls.at(-1)!;
        const upstream = new URL(String(url));
        expect(upstream.searchParams.get('q')).toBe('100%');
        expect(upstream.searchParams.get('page')).toBe('1');
        if (endpoint !== 'achievements') {
            expect(upstream.searchParams.get('userId')).toBe(id);
        }
        expect(new Headers(init?.headers).get('authorization')).toBe('Bearer private-session');
        expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
});

it('forwards achievement assignment rule image and availability in the same multipart request', async () => {
    transport.mockResolvedValue(
        new Response(JSON.stringify({ id }), { status: 201, headers: { 'content-type': 'application/json' } }),
    );
    const form = new FormData();
    form.set('title', 'Пятый год');
    form.set('description', 'Среди своих');
    form.set('type', 'AUTOMATIC');
    form.set('pageAgeYears', '5');
    form.set('active', 'false');
    form.set('file', new File(['image'], 'badge.png', { type: 'image/png' }));
    const request = new Request('https://people.example/api/person/v1/admin/achievements', {
        method: 'POST',
        headers: { origin: config.publicUrl },
    });
    vi.spyOn(request, 'formData').mockResolvedValue(form);
    const response = await handlePersonRequest(request, ['v1', 'admin', 'achievements'], config);
    expect(response.status).toBe(201);
    const [url, init] = transport.mock.calls[0];
    expect(String(url)).toBe('http://person.internal/v1/admin/achievements');
    const body = init?.body as FormData;
    expect(body.get('type')).toBe('AUTOMATIC');
    expect(body.get('pageAgeYears')).toBe('5');
    expect(body.get('active')).toBe('false');
    expect(body.get('file')).toBeInstanceOf(File);
});
