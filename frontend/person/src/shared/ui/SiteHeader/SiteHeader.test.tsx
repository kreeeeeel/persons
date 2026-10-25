import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { SiteHeader } from '@/shared/ui/SiteHeader/SiteHeader';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => null,
    useSearchParams: () => null,
}));

afterEach(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    cleanup();
});

it('enables the header background after scrolling and restores transparency at the top', () => {
    renderUi(<SiteHeader showSearch={false}>{null}</SiteHeader>);
    const header = screen.getByRole('banner');
    expect(header).toHaveAttribute('data-scrolled', 'false');
    act(() => {
        Object.defineProperty(window, 'scrollY', { configurable: true, value: 80 });
        window.dispatchEvent(new Event('scroll'));
    });
    expect(header).toHaveAttribute('data-scrolled', 'true');
    act(() => {
        Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
        window.dispatchEvent(new Event('scroll'));
    });
    expect(header).toHaveAttribute('data-scrolled', 'false');
});

it('places compact search after the logo on internal pages', () => {
    renderUi(<SiteHeader>{null}</SiteHeader>);
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Найти человека');
    const header = screen.getByRole('banner');
    expect(header).toHaveAttribute('data-search', 'true');
    expect(
        screen.getByRole('link', { name: 'Те ещё люди.' }).compareDocumentPosition(screen.getByRole('search')) &
            Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
});

it('hides header search on the landing page', () => {
    renderUi(
        <SiteHeader showSearch={false} showFeed={false}>
            {null}
        </SiteHeader>,
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Лента' })).not.toBeInTheDocument();
});

it.each([
    ['ru', 'Конфиденциальность'],
    ['en', 'Privacy policy'],
] as const)('keeps privacy navigation named and includes its icon in %s', (locale, label) => {
    renderUi(<SiteHeader showSearch={false}>{null}</SiteHeader>, locale);
    const privacy = screen.getByRole('link', { name: label });
    expect(privacy).toHaveAttribute('href', `/${locale}/privacy`);
    expect(privacy.querySelector('svg')).toBeInTheDocument();
});
