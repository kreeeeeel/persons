import { expect, it, vi } from 'vitest';
import { GET } from '@/app/person/[locale]/[tag]/route';

vi.mock('@/shared/config/server', () => ({
    getServerConfig: () => ({ personPublicUrl: 'http://127.0.0.1:3002' }),
}));

it.each(['ru', 'en'])('returns sign-in to the actual feed in %s', async (locale) => {
    const response = await GET(new Request(`http://127.0.0.1:3000/person/${locale}/feed`), {
        params: Promise.resolve({ locale, tag: 'feed' }),
    });
    expect(response.headers.get('location')).toBe(`http://127.0.0.1:3002/${locale}/feed`);
});

it('preserves a profile destination and its locale', async () => {
    const response = await GET(new Request('http://127.0.0.1:3000/person/en/vadim'), {
        params: Promise.resolve({ locale: 'en', tag: 'vadim' }),
    });
    expect(response.headers.get('location')).toBe('http://127.0.0.1:3002/vadim');
    expect(response.cookies.get('PERSONS_LOCALE')?.value).toBe('en');
});

it.each([
    ['ru', '//example.test'],
    ['xx', 'feed'],
])('rejects unsafe return path %s/%s', async (locale, tag) => {
    const response = await GET(new Request('http://127.0.0.1:3000/person/ru/feed'), {
        params: Promise.resolve({ locale, tag }),
    });
    expect(response.status).toBe(404);
    expect(response.headers.has('location')).toBe(false);
});
