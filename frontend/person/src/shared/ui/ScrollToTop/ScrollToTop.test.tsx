import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { ScrollToTop } from '@/shared/ui/ScrollToTop/ScrollToTop';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
});

it.each([false, true])('appears after scrolling and respects reduced motion: %s', (reduced) => {
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
        matches: query.includes('prefers-reduced-motion') && reduced,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
    renderUi(<ScrollToTop />);
    expect(screen.queryByRole('button', { name: 'Наверх' })).not.toBeInTheDocument();
    act(() => {
        Object.defineProperty(window, 'scrollY', { configurable: true, value: 600 });
        window.dispatchEvent(new Event('scroll'));
    });
    const button = screen.getByRole('button', { name: 'Наверх' });
    expect(button).toHaveAttribute('data-visible', 'true');
    fireEvent.click(button);
    expect(scroll).toHaveBeenCalledWith({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
    act(() => {
        Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
        window.dispatchEvent(new Event('scroll'));
    });
    expect(button).toHaveAttribute('aria-hidden', 'true');
});
