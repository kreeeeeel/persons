import { afterEach, expect, it, vi } from 'vitest';
import { createDynPropertyProxy } from '@persons/dynamic-properties/server';

vi.mock('server-only', () => ({}));
const runtime = vi.hoisted(() => ({ initialize: vi.fn().mockResolvedValue(undefined), snapshot: () => [] }));
vi.mock('@persons/dynamic-properties/ServerDynPropertyClient', () => ({
    ServerDynPropertyClient: class {
        initialize = runtime.initialize;
        snapshot = runtime.snapshot;
    },
}));
afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

it('keeps registration private, rejects cross-origin updates and forwards authenticated administration', async () => {
    const transport = vi.fn().mockResolvedValue(new Response('{"code":"CONFLICT"}', { status: 409 }));
    vi.stubGlobal('fetch', transport);
    const proxy = createDynPropertyProxy({
        url: 'http://properties.internal',
        publicUrl: 'https://people.example',
        scope: 'frontend-person',
        properties: [],
        serviceToken: () => 'service-token',
        sessionToken: async () => 'session-token',
    });
    const denied = await proxy(
        new Request('https://people.example/api/dynamic-properties/v1/admin/variables/key', {
            method: 'PUT',
            headers: { origin: 'https://other.example' },
            body: '{}',
        }),
        ['v1', 'admin', 'variables', 'key'],
    );
    expect(denied.status).toBe(403);
    const registration = await proxy(
        new Request(
            'https://people.example/api/dynamic-properties/v1/dynamic-properties/registrations/frontend-person',
        ),
        ['v1', 'dynamic-properties', 'registrations', 'frontend-person'],
    );
    expect(registration.status).toBe(404);
    expect(transport).not.toHaveBeenCalled();
    const response = await proxy(
        new Request('https://people.example/api/dynamic-properties/v1/admin/variables/key', {
            method: 'PUT',
            headers: { origin: 'https://people.example' },
            body: '{"value":"true","revision":1}',
        }),
        ['v1', 'admin', 'variables', 'key'],
    );
    expect(response.status).toBe(409);
    const [url, options] = transport.mock.calls[0];
    expect(url).toBe('http://properties.internal/v1/admin/variables/key');
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer session-token');
    expect(new Headers(options.headers).get('X-Service-Authorization')).toBe('Bearer service-token');
    expect(await response.json()).toEqual({ code: 'CONFLICT' });
});

it('returns public configuration from the Node cache and rejects anonymous administration', async () => {
    const transport = vi.fn();
    vi.stubGlobal('fetch', transport);
    const proxy = createDynPropertyProxy({
        url: 'http://properties.internal',
        publicUrl: 'https://people.example',
        scope: 'frontend-person',
        properties: [],
        serviceToken: () => 'service-token',
        sessionToken: async () => undefined,
    });
    const response = await proxy(
        new Request('https://people.example/api/dynamic-properties/v1/dynamic-properties/public'),
        ['v1', 'dynamic-properties', 'public'],
    );
    expect(await response.json()).toEqual([]);
    const admin = await proxy(new Request('https://people.example/api/dynamic-properties/v1/admin/variables'), [
        'v1',
        'admin',
        'variables',
    ]);
    expect(admin.status).toBe(401);
    expect(transport).not.toHaveBeenCalled();
});
