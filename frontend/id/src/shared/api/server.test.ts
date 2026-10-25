import { beforeEach, expect, it, vi } from 'vitest';
import { idConfiguration } from '@/shared/api/server';

const mocks = vi.hoisted(() => ({ trusted: false }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
    cookies: async () => ({
        get: (name: string) => (name === 'PERSONS_SESSION' ? { value: 'session-cookie' } : undefined),
    }),
    headers: async () =>
        new Headers({
            'user-agent': 'test-browser',
            'x-forwarded-for': '198.51.100.7, 10.0.0.1',
            'x-request-id': 'request-123',
            'x-client-region': 'Moscow, Russia',
        }),
}));
vi.mock('next/server', () => ({
    userAgentFromString: () => ({
        os: { name: 'Windows', version: '10' },
        browser: { name: 'Chrome', version: '140' },
        device: { type: undefined },
    }),
}));
vi.mock('@/shared/config/server', () => ({
    getServerConfig: () => ({
        idUrl: 'http://id:8081',
        internalJwtSecret: 'test-internal-secret-at-least-32-characters',
        trustProxy: mocks.trusted,
    }),
}));

beforeEach(() => {
    mocks.trusted = false;
});

it('preserves browser, OS, device and request metadata without trusting arbitrary forwarded IPs', async () => {
    const config = await idConfiguration();

    expect(config.headers).toMatchObject({
        'X-Client-IP': '',
        'X-Client-Region': '',
        'X-Client-OS': 'Windows',
        'X-Client-OS-Version': '10',
        'X-Client-Browser': 'Chrome 140',
        'X-Client-Device': 'desktop',
        'X-Client-Origin': 'persons-id-web',
        'X-Request-ID': 'request-123',
    });
    expect(config.headers).toHaveProperty('X-Service-Authorization', expect.stringMatching(/^Bearer /));
});

it('forwards the client IP only behind the configured trusted gateway', async () => {
    mocks.trusted = true;

    expect((await idConfiguration()).headers).toHaveProperty('X-Client-IP', '198.51.100.7');
    expect((await idConfiguration()).headers).toHaveProperty('X-Client-Region', 'Moscow, Russia');
});
