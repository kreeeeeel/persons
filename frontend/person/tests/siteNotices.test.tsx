import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PersonsThemeProvider } from '@persons/theme';
import { MARQUEE_STORAGE_KEY } from '@persons/ui/BottomMarquee/useMarqueePreference';
import { InterfaceSettings } from '@persons/person-domain/account/components/InterfaceSettings/InterfaceSettings';
import { SiteNotices } from '@/shared/ui/SiteNotices/SiteNotices';
import { renderUi } from '@test/render';

vi.mock('next/navigation', () => ({
    usePathname: () => '/demo',
    useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));

function renderNotices(locale: 'ru' | 'en' = 'ru', showMarqueeSetting = true) {
    return renderUi(
        <PersonsThemeProvider locale={locale} preference="light" resolvedTheme="light">
            <InterfaceSettings showMarqueeSetting={showMarqueeSetting} />
            <SiteNotices enabled />
        </PersonsThemeProvider>,
        locale,
    );
}

beforeEach(() => localStorage.clear());

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

it.each([
    [
        'ru',
        'Информация о контенте сайта',
        'Все персонажи вымышленные, совпадения случайны',
        'На сайте используется контент, созданный с помощью ИИ',
    ],
    [
        'en',
        'About the content on this site',
        'All characters are fictional; any resemblance is coincidental',
        'This site uses AI-generated content',
    ],
] as const)('renders both notices in %s with one accessible copy', (locale, label, fictional, ai) => {
    renderNotices(locale);

    const region = screen.getByRole('region', { name: label });

    expect(region).toHaveAttribute('data-view', 'glass');
    expect(
        within(region)
            .getAllByRole('listitem')
            .map((item) => item.textContent),
    ).toEqual([fictional, ai]);
    expect(within(region).getAllByRole('list')).toHaveLength(1);
    expect(region).toHaveAttribute('tabindex', '0');
});

it('places the toggle first, immediately hides the notices and persists across remounts', () => {
    const view = renderNotices();
    const toggle = screen.getByRole('switch', { name: 'Скрывать бегущую строку' });

    expect(
        toggle.compareDocumentPosition(screen.getByRole('radiogroup', { name: 'Тема' })) &
            Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(localStorage.getItem(MARQUEE_STORAGE_KEY)).toBe('true');
    expect(document.documentElement.style.getPropertyValue('--persons-bottom-marquee-height')).toBe('');

    view.unmount();
    renderNotices('en');
    expect(screen.getByRole('switch', { name: 'Hide the scrolling ticker' })).toBeChecked();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'Hide the scrolling ticker' }));
    expect(screen.getByRole('region', { name: 'About the content on this site' })).toBeVisible();
});

it('synchronizes visibility when the preference changes in another tab', () => {
    renderNotices();

    act(() => {
        localStorage.setItem(MARQUEE_STORAGE_KEY, 'true');
        window.dispatchEvent(new StorageEvent('storage', { key: MARQUEE_STORAGE_KEY, newValue: 'true' }));
    });

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeChecked();

    act(() => {
        localStorage.clear();
        window.dispatchEvent(new StorageEvent('storage', { key: null }));
    });

    expect(screen.getByRole('region')).toBeVisible();
    expect(screen.getByRole('switch')).not.toBeChecked();
});

it('reports a storage failure and keeps the notices visible', () => {
    renderNotices();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Storage unavailable', 'SecurityError');
    });

    fireEvent.click(screen.getByRole('switch'));

    expect(screen.getByText('Не удалось сохранить настройку. Проверьте доступ к хранилищу браузера.')).toBeVisible();
    expect(screen.getByRole('region')).toBeVisible();
    expect(screen.getByRole('switch')).not.toBeChecked();
});

it('does not offer the ticker setting in applications without a ticker', () => {
    renderNotices('ru', false);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
});

it('keeps the ticker hidden when the administrator disables it', () => {
    renderUi(<SiteNotices enabled={false} />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
});

it('updates the reserved height after resizing and releases it when unmounted', () => {
    let height = 44;
    const observers: (() => void)[] = [];
    vi.spyOn(window, 'ResizeObserver').mockImplementation(function (notify) {
        const observer = { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
        observers.push(() => notify([], observer));
        return observer;
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, 320, height));

    const view = renderNotices();

    expect(document.documentElement.style.getPropertyValue('--persons-bottom-marquee-height')).toBe('44px');
    height = 116;
    act(() => observers.forEach((notify) => notify()));
    expect(document.documentElement.style.getPropertyValue('--persons-bottom-marquee-height')).toBe('116px');

    view.unmount();
    expect(document.documentElement.style.getPropertyValue('--persons-bottom-marquee-height')).toBe('');
});
