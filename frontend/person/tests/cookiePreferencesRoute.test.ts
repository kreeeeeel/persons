import { expect, it, vi } from 'vitest';
import { POST } from '@/app/api/cookie-preferences/route';

const config = vi.hoisted(() => ({
    publicUrl: 'https://people.example',
    sessionCookieDomain: undefined as string | undefined,
}));

vi.mock('@/shared/config/server', () => ({ getServerConfig: () => config }));

it.each(['accepted', 'rejected'])('saves a cookie choice and clears the visitor after refusal: %s', async (choice) => {
    const response = await POST(
        new Request('https://people.example/api/cookie-preferences', {
            method: 'POST',
            headers: { origin: 'https://people.example' },
            body: JSON.stringify({ choice }),
        }),
    );
    expect(response.status).toBe(200);
    expect(response.cookies.get('PERSONS_OPTIONAL_COOKIES')?.value).toBe(choice);
    expect(response.cookies.get('PERSONS_VISITOR')?.maxAge).toBe(choice === 'rejected' ? 0 : undefined);
});

it('rejects cross-origin requests and malformed choices', async () => {
    const forbidden = await POST(
        new Request('https://people.example/api/cookie-preferences', {
            method: 'POST',
            headers: { origin: 'https://other.example' },
            body: '{"choice":"accepted"}',
        }),
    );
    expect(forbidden.status).toBe(403);
    const invalid = await POST(
        new Request('https://people.example/api/cookie-preferences', {
            method: 'POST',
            headers: { origin: 'https://people.example' },
            body: '{"choice":true}',
        }),
    );
    expect(invalid.status).toBe(400);
});

it.each(['accepted', 'rejected'])('shares the %s preference across ID, CMS and the main site', async (choice) => {
    config.sessionCookieDomain = 'people.example';

    try {
        const response = await POST(
            new Request('https://people.example/api/cookie-preferences', {
                method: 'POST',
                headers: { origin: 'https://people.example' },
                body: JSON.stringify({ choice }),
            }),
        );

        expect(response.cookies.get('PERSONS_OPTIONAL_COOKIES')).toMatchObject({
            value: choice,
            domain: 'people.example',
            path: '/',
            secure: true,
            sameSite: 'lax',
        });
    } finally {
        config.sessionCookieDomain = undefined;
    }
});
