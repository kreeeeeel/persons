import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MilitaryServiceCountdown } from '@/modules/profile/components/MilitaryServiceCountdown';
import { renderUi } from '@test/render';

const today = '2026-10-26';
const service = { departureDate: '2026-06-01', returnDate: '2027-06-01' };

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

it('shows the days left, the exact return date and elapsed service progress', () => {
    renderUi(<MilitaryServiceCountdown service={service} today={today} />);
    expect(screen.getByRole('region', { name: 'до дембеля' })).toHaveTextContent('218');
    expect(screen.getByText('дней')).toBeVisible();
    expect(screen.getByText('Позади 147 из 365 дней')).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText('Дембель 1 июня 2027 г.')).toHaveAttribute('datetime', service.returnDate);
});

it.each([
    [1, 'день'],
    [2, 'дня'],
    [5, 'дней'],
    [21, 'день'],
    [22, 'дня'],
    [25, 'дней'],
])('uses the correct Russian plural for %i days', (days, word) => {
    const departureDate = new Date(Date.parse(today) + Number(days) * 86_400_000).toISOString().slice(0, 10);
    renderUi(<MilitaryServiceCountdown service={{ departureDate }} today={today} />);
    expect(screen.getByText(word)).toBeVisible();
    expect(screen.getByRole('region', { name: 'до призыва' })).toBeVisible();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});

it('shows a completed state without a negative countdown', () => {
    renderUi(<MilitaryServiceCountdown service={{ ...service, returnDate: '2026-10-23' }} today={today} />);
    expect(screen.getByRole('region', { name: 'Уже дома' })).toHaveTextContent('Дембель 23 октября 2026 г.');
    expect(screen.queryByText('С возвращением!')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText('до дембеля')).not.toBeInTheDocument();
});

it('hides the return notice after seven days', () => {
    const { container } = renderUi(
        <MilitaryServiceCountdown service={{ ...service, returnDate: '2026-10-19' }} today={today} />,
    );
    expect(container).toBeEmptyDOMElement();
});

it('shows departure today without a zero-day countdown', () => {
    renderUi(<MilitaryServiceCountdown service={{ ...service, departureDate: today }} today={today} />);
    expect(screen.getByText('Призыв сегодня')).toBeVisible();
    expect(screen.queryByText('Сегодня начинается новая глава')).not.toBeInTheDocument();
});

it('does not invent a countdown when the return date is missing', () => {
    renderUi(<MilitaryServiceCountdown service={{ departureDate: service.departureDate }} today={today} />);
    expect(screen.getByText('Дата дембеля пока не указана')).toBeVisible();
    expect(screen.getByText('На службе 147 дней')).toBeVisible();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});

it('updates after midnight in Moscow without reloading', async () => {
    vi.setSystemTime(new Date('2026-10-26T20:59:50Z'));
    renderUi(<MilitaryServiceCountdown service={{ departureDate: '2026-10-27' }} today={today} />);
    expect(screen.getByText('до призыва')).toBeVisible();
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(screen.getByText('Призыв сегодня')).toBeVisible();
});

it('renders English dates and day labels', () => {
    renderUi(<MilitaryServiceCountdown service={service} today={today} />, 'en', 'dark');
    expect(screen.getByRole('region', { name: 'until homecoming' })).toHaveTextContent('218');
    expect(screen.getByText('days')).toBeVisible();
    expect(screen.getByText('Homecoming June 1, 2027')).toHaveAttribute('datetime', service.returnDate);
});
