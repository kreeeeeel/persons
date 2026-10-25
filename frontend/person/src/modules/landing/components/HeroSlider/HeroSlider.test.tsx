import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { HeroSlider } from '@/modules/landing/components/HeroSlider/HeroSlider';
import { slides, SLIDE_INTERVAL_MS } from '@/modules/landing/model/slides';

vi.mock('@persons/ui/useImageState', () => ({ useImageState: () => ({ ready: true, failed: false }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => null }));
vi.mock('@persons/person-domain/hooks/usePersonSearch', () => ({ usePersonSearch: () => ({ enabled: false }) }));

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

it('advances automatically and allows selecting another scene', () => {
    renderUi(<HeroSlider />);
    expect(screen.getByRole('heading', { name: /Свои люди/ })).toBeInTheDocument();
    const controls = within(screen.getByRole('group', { name: 'Управление слайдами' }));
    expect(controls.getAllByRole('button')[0]).toHaveAccessibleName('Остановить слайд-шоу');
    expect(controls.queryByRole('button', { name: /Предыдущая|Следующая/ })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(SLIDE_INTERVAL_MS));
    expect(screen.getByRole('heading', { name: /Здесь каждый/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `Иллюстрация 3 из ${slides.length}` }));
    expect(screen.getByRole('heading', { name: /Играем вместе/ })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(SLIDE_INTERVAL_MS));
    expect(screen.getByRole('heading', { name: /Играем вместе/ })).toBeInTheDocument();
});

it('pauses automatic movement while the user types in the search field', () => {
    renderUi(<HeroSlider />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Вадим' } });
    act(() => vi.advanceTimersByTime(SLIDE_INTERVAL_MS * 2));

    expect(input).toHaveValue('Вадим');
    expect(screen.getByRole('heading', { name: /Свои люди/ })).toBeInTheDocument();
});

it('does not advance an inactive browser tab', () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    renderUi(<HeroSlider />);
    act(() => vi.advanceTimersByTime(SLIDE_INTERVAL_MS));

    expect(screen.getByRole('heading', { name: /Свои люди/ })).toBeInTheDocument();
});

it('resumes rotation when the user presses play with keyboard focus on the control', () => {
    renderUi(<HeroSlider />);
    fireEvent.click(screen.getByRole('button', { name: 'Остановить слайд-шоу' }));
    act(() => vi.advanceTimersByTime(SLIDE_INTERVAL_MS));
    expect(screen.getByRole('heading', { name: /Свои люди/ })).toBeInTheDocument();
    const play = screen.getByRole('button', { name: 'Продолжить слайд-шоу' });
    fireEvent.focus(play);
    fireEvent.click(play);
    act(() => vi.advanceTimersByTime(SLIDE_INTERVAL_MS));
    expect(screen.getByRole('heading', { name: /Здесь каждый/ })).toBeInTheDocument();
});

it('keeps reduced-motion users on a static scene with manual navigation', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    renderUi(<HeroSlider />);
    act(() => vi.advanceTimersByTime(SLIDE_INTERVAL_MS));
    expect(screen.getByRole('heading', { name: /Свои люди/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Продолжить слайд-шоу' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `Иллюстрация 2 из ${slides.length}` }));
    expect(screen.getByRole('heading', { name: /Здесь каждый/ })).toBeInTheDocument();
});

it('preserves elapsed slide time and pauses its fill during search focus and manual pause', () => {
    renderUi(<HeroSlider />);
    const first = screen.getByRole('button', { name: `Иллюстрация 1 из ${slides.length}` });
    const fill = first.querySelector('[style*="animation-duration"]');
    expect(fill).toHaveStyle({ animationDuration: `${SLIDE_INTERVAL_MS}ms`, animationPlayState: 'running' });
    act(() => vi.advanceTimersByTime(3000));
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    expect(fill).toHaveStyle({ animationPlayState: 'paused' });
    act(() => vi.advanceTimersByTime(20000));
    fireEvent.blur(input, { relatedTarget: document.body });
    expect(fill).toHaveStyle({ animationPlayState: 'running' });
    act(() => vi.advanceTimersByTime(SLIDE_INTERVAL_MS - 3001));
    expect(first).toHaveAttribute('aria-pressed', 'true');
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('button', { name: `Иллюстрация 2 из ${slides.length}` })).toHaveAttribute(
        'aria-pressed',
        'true',
    );
});

it('freezes both the fill and remaining time while the browser tab is hidden', () => {
    renderUi(<HeroSlider />);
    act(() => vi.advanceTimersByTime(2000));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    const first = screen.getByRole('button', { name: `Иллюстрация 1 из ${slides.length}` });
    expect(first.querySelector('[style*="animation-duration"]')).toHaveStyle({ animationPlayState: 'paused' });
    act(() => vi.advanceTimersByTime(30000));
    expect(first).toHaveAttribute('aria-pressed', 'true');
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    fireEvent(document, new Event('visibilitychange'));
    act(() => vi.advanceTimersByTime(SLIDE_INTERVAL_MS - 2000));
    expect(screen.getByRole('button', { name: `Иллюстрация 2 из ${slides.length}` })).toHaveAttribute(
        'aria-pressed',
        'true',
    );
});
