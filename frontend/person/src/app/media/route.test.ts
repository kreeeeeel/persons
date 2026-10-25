import { afterEach, expect, it, vi } from 'vitest';
import { GET } from '@/app/media/[name]/route';

vi.mock('@/shared/config/server', () => ({ getServerConfig: () => ({ assetBaseUrl: 'https://assets.example.test' }) }));
afterEach(() => vi.unstubAllGlobals());

it.each(['constructor', '__proto__', 'toString'])(
    'rejects inherited object names outside the asset allowlist: %s',
    async (name) => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const response = await GET(new Request('https://example.test/media/unknown'), {
            params: Promise.resolve({ name }),
        });
        expect(response.status).toBe(404);
        expect(fetchMock).not.toHaveBeenCalled();
    },
);

it('caches versioned public illustrations immutably and keeps the logo refreshable', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response('image'));
    vi.stubGlobal('fetch', fetchMock);
    const request = new Request('https://example.test/media/play-board-v3.webp');
    const illustration = await GET(request, { params: Promise.resolve({ name: 'play-board-v3.webp' }) });
    expect(illustration.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    const logo = await GET(request, { params: Promise.resolve({ name: 'logo.svg' }) });
    expect(logo.headers.get('Cache-Control')).toBe('public, max-age=3600');
    const missing = await GET(request, { params: Promise.resolve({ name: 'private-user-photo.webp' }) });
    expect(missing.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(2);
});
