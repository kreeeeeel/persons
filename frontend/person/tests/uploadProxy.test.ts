import { expect, it, vi } from 'vitest';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config } from '@/proxy';

vi.mock('next-intl/middleware', () => ({ default: () => vi.fn() }));

it('sends multipart uploads directly to their protected route handlers without a body clone', () => {
    const url = '/api/person/v1/persons/b4b00d6a-e38b-4d16-820c-80209aecfb15/media';
    expect(
        unstable_doesMiddlewareMatch({
            config,
            url,
            headers: { 'content-type': 'multipart/form-data; boundary=test' },
        }),
    ).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url, headers: { 'content-type': 'application/json' } })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, url: '/ru/person/vadim' })).toBe(true);
});
