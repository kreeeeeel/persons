import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getServerConfig } from '@/shared/config/server';

vi.mock('server-only', () => ({}));

beforeEach(() => {
    vi.stubEnv('APP_ENV', 'dev');
    vi.stubEnv('SESSION_COOKIE_DOMAIN', '');
    vi.stubEnv('PUBLIC_URL', 'http://localhost:3000');
    vi.stubEnv('ID_PUBLIC_URL', 'http://localhost:3000');
    vi.stubEnv('ADMIN_PUBLIC_URL', 'http://localhost:3001');
    vi.stubEnv('PERSON_PUBLIC_URL', 'http://localhost:3002');
});

afterEach(() => vi.unstubAllEnvs());

function productionUrls() {
    vi.stubEnv('PUBLIC_URL', 'https://id.people.test');
    vi.stubEnv('ID_PUBLIC_URL', 'https://id.people.test');
    vi.stubEnv('ADMIN_PUBLIC_URL', 'https://cms.people.test');
    vi.stubEnv('PERSON_PUBLIC_URL', 'https://people.test');
}

it('keeps local sessions host-only across ports', () => {
    expect(getServerConfig()).toMatchObject({ sessionCookieDomain: undefined, secureCookies: false });
});

it('shares a Secure cookie across the configured HTTPS subdomains', () => {
    productionUrls();
    vi.stubEnv('SESSION_COOKIE_DOMAIN', '.People.test');
    expect(getServerConfig()).toMatchObject({ sessionCookieDomain: 'people.test', secureCookies: true });
});

it('rejects separate public hosts without an explicit common cookie domain', () => {
    productionUrls();
    expect(() => getServerConfig()).toThrow('SESSION_COOKIE_DOMAIN is required');
});

it.each(['test', 'other.test', 'people.test/path', '..people.test', '*.people.test', 'people.test; Secure'])(
    'rejects an invalid or unrelated cookie domain: %s',
    (domain) => {
        productionUrls();
        vi.stubEnv('SESSION_COOKIE_DOMAIN', domain);
        expect(() => getServerConfig()).toThrow('SESSION_COOKIE_DOMAIN must cover');
    },
);

it('rejects HTTP and hosts that merely end with the domain text', () => {
    productionUrls();
    vi.stubEnv('SESSION_COOKIE_DOMAIN', 'people.test');
    vi.stubEnv('PUBLIC_URL', 'http://id.people.test');
    expect(() => getServerConfig()).toThrow('SESSION_COOKIE_DOMAIN must cover');
    vi.stubEnv('PUBLIC_URL', 'https://otherpeople.test');
    expect(() => getServerConfig()).toThrow('SESSION_COOKIE_DOMAIN must cover');
});

it('uses the gateway for local backend requests', () => {
    vi.stubEnv('ID_BASE_URL', undefined);
    vi.stubEnv('PERSON_BASE_URL', undefined);
    expect(getServerConfig()).toMatchObject({ idUrl: 'http://localhost:8087/id' });
});
