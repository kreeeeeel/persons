import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ProfileMetrics } from '@/modules/profile/components/ProfileMetrics';
import { renderUi } from '@test/render';

const stats = {
    views: 12840,
    comments: 3,
    ratings: 10,
    ratingAverage: 4.8,
    moments: 0,
    photos: 0,
    creditEntries: 0,
    creditScore: 0,
    reputation: 'GOOD' as const,
};

afterEach(cleanup);

it('shows only views and the existing colored rating', () => {
    renderUi(<ProfileMetrics stats={stats} />);
    expect(screen.getByRole('group', { name: 'Просмотры' })).toHaveTextContent('12 840');
    const rating = within(screen.getByRole('group', { name: 'Оценки' })).getByText('4.8 / 5');
    expect(rating).toHaveAttribute('data-tone', 'great');
    expect(screen.queryByText('Стена')).not.toBeInTheDocument();
    expect(screen.queryByText('Репутация')).not.toBeInTheDocument();
});

it('keeps an unrated profile neutral', () => {
    renderUi(<ProfileMetrics stats={{ ...stats, ratings: 0, ratingAverage: undefined }} />);
    expect(screen.getByText('—')).toHaveAttribute('data-tone', 'empty');
});
