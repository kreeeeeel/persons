import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { TypingHeading } from '@/modules/landing/components/TypingHeading/TypingHeading';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

it('types the text progressively and stops the timer after the last character', () => {
    vi.useFakeTimers();
    renderUi(<TypingHeading text="Свои" ready />);
    const heading = screen.getByRole('heading', { name: 'Свои' });

    expect(heading).toHaveTextContent('');
    act(() => vi.advanceTimersByTime(50));
    expect(heading.textContent).toBe('С');
    act(() => vi.advanceTimersByTime(500));
    expect(heading.textContent).toBe('Свои');
    expect(vi.getTimerCount()).toBe(0);
});

it('shows the complete text immediately for reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    renderUi(<TypingHeading text="Свои истории" ready />);

    expect(screen.getByRole('heading')).toHaveTextContent('Свои истории');
});

it('preserves the two explicit lines throughout typing, including the line break', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    renderUi(<TypingHeading text={'Свои люди.\nСвои истории.'} ready />);
    const heading = screen.getByRole('heading');
    const lines = heading.firstElementChild?.children;

    expect(lines).toHaveLength(2);
    act(() => vi.advanceTimersByTime(450));
    expect(lines?.[0]).toHaveTextContent('Свои люди.');
    expect(lines?.[1]?.textContent).toBe('');
    act(() => vi.advanceTimersByTime(90));
    expect(lines?.[0]).toHaveTextContent('Свои люди.');
    expect(lines?.[1]).toHaveTextContent('С');
    act(() => vi.advanceTimersByTime(1000));
    expect(lines?.[1]).toHaveTextContent('Свои истории.');
    expect(lines).toHaveLength(2);
});

it('reserves the heading space until the illustration is ready', () => {
    renderUi(<TypingHeading text="Свои" ready={false} />);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
});
