import { cleanup, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { renderUi } from '@test/render';
import { ProfileStats } from '@/modules/profile/components/ProfileStats/ProfileStats';

afterEach(cleanup);

it.each([
    ['UNKNOWN', 'Нет отзывов'],
    ['GOOD', 'Хорошая'],
    ['AVERAGE', 'Средняя'],
    ['BAD', 'Плохая'],
] as const)('displays the %s reputation as a text label, without points', (reputation, label) => {
    renderUi(
        <ProfileStats
            stats={{
                comments: 1,
                ratings: 2,
                views: 3,
                moments: 0,
                photos: 0,
                creditEntries: 4,
                creditScore: 999,
                reputation,
            }}
        />,
    );
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByText('999')).not.toBeInTheDocument();
});
