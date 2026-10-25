import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ContentTime } from '@persons/person-domain/ContentTime';
import { renderUi } from '@test/render';

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T12:40:30Z'));
});
afterEach(() => {
    cleanup();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
});

it.each([
    ['ru', '2026-10-22T12:40:15Z', 'Недавно'],
    ['ru', '2026-10-22T12:38:30Z', '2 минуты назад'],
    ['ru', '2026-10-22T10:40:30Z', '2 часа назад'],
    ['ru', '2026-10-21T12:40:30Z', 'Вчера в 15:40'],
    ['ru', '2026-10-20T12:40:30Z', '20 окт., 15:40'],
    ['en', '2026-10-22T12:40:15Z', 'Just now'],
    ['en', '2026-10-22T12:38:30Z', '2 minutes ago'],
    ['en', '2026-10-21T12:40:30Z', 'Yesterday at 15:40'],
    ['en', '2026-10-20T12:40:30Z', 'Oct 20, 15:40'],
] as const)('formats %s publication time: %s', (locale, date, expected) => {
    const { container } = renderUi(<ContentTime date={new Date(date)} />, locale);
    const time = container.querySelector('time');
    expect(time).toHaveTextContent(expected);
    expect(time).toHaveAttribute('datetime', new Date(date).toISOString());
    expect(time?.title).toMatch(/\d{1,2}:\d{2}/);
});

it('uses the Moscow calendar day across midnight and retains the year for older entries', () => {
    vi.setSystemTime(new Date('2026-10-22T21:05:00Z'));
    renderUi(
        <>
            <ContentTime date={new Date('2026-10-22T20:00:00Z')} />
            <ContentTime date={new Date('2025-10-22T12:40:30Z')} />
        </>,
    );
    expect(screen.getByText('Вчера в 23:00')).toBeInTheDocument();
    expect(screen.getByText(/2025.*15:40/)).toBeInTheDocument();
});

it('updates relative times with one shared clock and stops it when unmounted', () => {
    renderUi(
        <>
            <ContentTime date={new Date('2026-10-22T12:40:15Z')} />
            <ContentTime date={new Date('2026-10-22T12:38:30Z')} />
        </>,
    );
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText('1 минуту назад')).toBeInTheDocument();
    expect(screen.getByText('3 минуты назад')).toBeInTheDocument();
});
