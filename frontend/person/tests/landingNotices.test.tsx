import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';
import { LocalizedContent } from '@/app/_providers/LocalizedContent/LocalizedContent';
import { PersonScreen } from '@/modules/landing/screens/PersonScreen/PersonScreen';
import { renderUi } from '@test/render';

const settings = vi.hoisted(() => ({ marqueeEnabled: true }));
vi.mock('next-intl/server', () => ({ getMessages: async () => ({}) }));
vi.mock('@/shared/dynamicProperties/server', () => ({
    dynamicPropertyProxy: { initialize: vi.fn(), snapshot: () => [] },
}));
vi.mock('@/app/_providers/AppProviders/AppProviders', () => ({
    AppProviders: ({ children }: PropsWithChildren) => children,
}));
vi.mock('@persons/person-domain/settings/useSiteSettings', () => ({ useSiteSettings: () => ({ data: settings }) }));
vi.mock('@persons/ui/loading/usePreloadedImages', () => ({ usePreloadedImages: () => true }));
vi.mock('@/shared/ui/SiteHeader/SiteHeader', () => ({ SiteHeader: () => null }));
vi.mock('@/modules/landing/components/HeroSlider/HeroSlider', () => ({ HeroSlider: () => null }));
vi.mock('@/shared/ui/CookieNotice/CookieNotice', () => ({ CookieNotice: () => null }));
beforeEach(() => {
    settings.marqueeEnabled = true;
    localStorage.clear();
});
afterEach(cleanup);

it.each(['person', 'feed', 'people'])('mounts the ticker once in the shared shell for %s', async (page) => {
    const shell = await LocalizedContent({
        locale: 'ru',
        preference: 'light',
        resolvedTheme: 'light',
        children: page === 'person' ? <PersonScreen account={null} /> : page,
    });
    renderUi(shell);
    expect(screen.getAllByRole('region', { name: 'Информация о контенте сайта' })).toHaveLength(1);
});

it('respects the global visibility setting on every page', async () => {
    settings.marqueeEnabled = false;
    renderUi(await LocalizedContent({ locale: 'ru', preference: 'light', resolvedTheme: 'light', children: 'feed' }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
});
