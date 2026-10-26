import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MilitaryServiceDate } from '@/modules/profile/components/MilitaryServiceDate';
import { renderUi } from '@test/render';

const today = '2026-10-26';

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
});

it('keeps the departure date in the desktop sidebar after service ends', () => {
    const { container } = renderUi(
        <MilitaryServiceDate
            service={{ departureDate: '2025-10-01', returnDate: '2026-10-01' }}
            today={today}
            showDepartureDate
        />,
    );
    expect(screen.getByText('Ушёл в армию')).toBeVisible();
    expect(container.querySelector('time')).toHaveAttribute('datetime', '2025-10-01');
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

it.each([
    ['2026-11-13', '2027-11-13', 'Скоро в армию', 'Уходит в армию', '2026-11-13'],
    ['2026-06-01', '2027-06-01', 'На службе', 'Ушёл в армию', '2026-06-01'],
    ['2025-10-01', '2026-10-01', 'Уже дома', 'Вернулся домой', '2026-10-01'],
    ['2025-10-26', today, 'Дембель сегодня', 'Вернулся домой', today],
    [today, '2027-10-26', 'Призыв сегодня', 'Ушёл в армию', today],
])('displays the correct status and date for %s', (departureDate, returnDate, status, caption, date) => {
    const { container } = renderUi(<MilitaryServiceDate service={{ departureDate, returnDate }} today={today} />);
    expect(screen.queryByText(status)).not.toBeInTheDocument();
    expect(screen.getByText(caption)).toBeVisible();
    expect(container.querySelector('time')).toHaveAttribute('datetime', date);
});
