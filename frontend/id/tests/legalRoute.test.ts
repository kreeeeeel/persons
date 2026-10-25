import { expect, it, vi } from 'vitest';
import { GET } from '@/app/legal/[locale]/[document]/route';

vi.mock('@/shared/config/server', () => ({
    getServerConfig: () => ({ personPublicUrl: 'https://people.example.test' }),
}));
vi.mock('next/navigation', () => ({
    notFound: () => {
        throw new Error('not found');
    },
}));

it('opens the selected document on the configured person origin', async () => {
    const response = await GET(new Request('http://localhost/legal/en/terms'), {
        params: Promise.resolve({ locale: 'en', document: 'terms' }),
    });
    expect(response.headers.get('location')).toBe('https://people.example.test/en/terms');
});

it('rejects unsupported documents and locales', async () => {
    await expect(
        GET(new Request('http://localhost/legal/en/other'), {
            params: Promise.resolve({ locale: 'en', document: 'other' }),
        }),
    ).rejects.toThrow('not found');
    await expect(
        GET(new Request('http://localhost/legal/xx/privacy'), {
            params: Promise.resolve({ locale: 'xx', document: 'privacy' }),
        }),
    ).rejects.toThrow('not found');
});
