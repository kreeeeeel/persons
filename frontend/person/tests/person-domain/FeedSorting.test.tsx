import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { CommentsFeed } from '@persons/person-domain/CommentsFeed';
import { CreditFeed } from '@persons/person-domain/CreditFeed';
import { RatingsFeed } from '@persons/person-domain/RatingsFeed';

const api = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { interactions: { listComments: api.list, listCredit: api.list, listRatings: api.list } },
    personError: async () => 'UNAVAILABLE',
    mediaHref: () => '',
}));

beforeEach(() => {
    api.list.mockReset();
    api.list.mockImplementation(async ({ sort, page }: { sort: string; page: number }) => ({
        page,
        size: 10,
        total: 1,
        items: [
            {
                id: sort,
                authorName: sort === 'MOST_DISLIKED' ? 'Автор с дизлайками' : 'Новый автор',
                createdAt: new Date(),
                text: 'Текст',
                description: 'Займ',
                kind: 'ON_TIME',
                value: 4,
                emoji: '⭐',
                likes: 1,
                dislikes: 2,
            },
        ],
    }));
});
afterEach(cleanup);

it.each(['comments', 'ratings', 'loans'] as const)(
    'resets the %s feed and requests the selected server order',
    async (kind) => {
        renderUi(
            kind === 'comments' ? (
                <CommentsFeed personId="person" signedIn={false} />
            ) : kind === 'ratings' ? (
                <RatingsFeed personId="person" />
            ) : (
                <CreditFeed personId="person" signedIn={false} />
            ),
        );
        expect(await screen.findByText('Новый автор')).toBeVisible();
        fireEvent.click(screen.getByRole('combobox', { name: 'Сортировка' }));
        fireEvent.click(screen.getByRole('option', { name: 'Больше дизлайков' }));
        await waitFor(() =>
            expect(api.list).toHaveBeenLastCalledWith(
                expect.objectContaining({ page: 0, sort: 'MOST_DISLIKED' }),
                expect.objectContaining({ signal: expect.any(AbortSignal) }),
            ),
        );
        expect(await screen.findByText('Автор с дизлайками')).toBeVisible();
        expect(screen.queryByText('Новый автор')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Кому не понравилось: 2')).toHaveTextContent('2');
        expect(screen.getByText('Сортировка')).toBeVisible();
    },
);
