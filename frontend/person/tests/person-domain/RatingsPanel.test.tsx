import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RatingsPanel } from '@/modules/profile/components/RatingsPanel/RatingsPanel';
import { renderUi } from '@test/render';

const api = vi.hoisted(() => ({ rate: vi.fn(), list: vi.fn(), remove: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { interactions: { ratePerson: api.rate, listRatings: api.list, removeRating: api.remove } },
    mediaHref: (id: string) => `/media/${id}`,
    personError: async () => 'UNAVAILABLE',
}));
beforeEach(() => {
    vi.clearAllMocks();
    api.list.mockResolvedValue({
        items: [{ id: 'vote', value: 3, emoji: '🐰', authorName: 'Вадим', authorTag: 'vadim', createdAt: new Date() }],
        total: 1,
        page: 0,
        size: 12,
    });
});
afterEach(cleanup);

it('shows Yuri and the invitation when nobody has rated the page', async () => {
    api.list.mockResolvedValue({ items: [], total: 0, page: 0, size: 12 });
    renderUi(<RatingsPanel personId="krel" signedIn={false} initialOptions={[]} onChange={vi.fn()} />);
    expect(await screen.findByText('Пока никто не оставил оценку. Ваша может стать первой.')).toBeVisible();
    expect(screen.getByRole('img', { name: 'Юрий ждёт первую оценку' })).toHaveAttribute(
        'src',
        expect.stringContaining('empty-ratings-yuri-v1.webp'),
    );
});

it('shows public ratings and links each identified author to their page', async () => {
    renderUi(<RatingsPanel personId="krel" signedIn={false} initialOptions={[]} onChange={vi.fn()} />);
    expect(await screen.findByRole('link', { name: 'Вадим' })).toHaveAttribute('href', '/vadim');
    expect(screen.getByLabelText('Оценка: 3 из 5')).toHaveTextContent('🐰🐰🐰');
    expect(screen.getByRole('button', { name: 'Эмодзи оценки' })).toBeDisabled();
    expect(screen.queryByRole('img', { name: 'Юрий ждёт первую оценку' })).not.toBeInTheDocument();
});

it('uses a compact emoji palette and persists the selected score and emoji together', async () => {
    api.rate.mockResolvedValue({
        options: [],
        total: 1,
        average: 4,
        value: 4,
        emoji: '🐰',
        availableEmojis: ['⭐', '🐰', '🚀'],
    });
    renderUi(
        <RatingsPanel
            personId="krel"
            signedIn
            initialOptions={[]}
            initialRating={{ options: [], availableEmojis: ['⭐', '🐰', '🚀'] }}
            onChange={vi.fn()}
        />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Эмодзи оценки' }));
    fireEvent.click(await screen.findByRole('option', { name: '🐰' }));
    fireEvent.click(screen.getByRole('button', { name: 'Поставить 4 из 5' }));
    expect(api.rate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    await waitFor(() =>
        expect(api.rate).toHaveBeenCalledWith({ id: 'krel', ratingInput: { emoji: '🐰', value: 4, comment: '' } }),
    );
    await waitFor(() => expect(screen.getByRole('article', { name: 'Ваш отзыв' })).toBeVisible());
});

it('keeps the saved review when deletion is cancelled and removes it only after confirmation', async () => {
    const user = userEvent.setup();
    const changed = vi.fn();
    api.remove.mockResolvedValue({ options: [], availableEmojis: ['⭐'] });
    renderUi(
        <RatingsPanel
            personId="krel"
            signedIn
            initialOptions={[]}
            initialRating={{ options: [], value: 4, emoji: '⭐', comment: 'Мой отзыв' }}
            onChange={changed}
        />,
    );
    await user.click(screen.getByRole('button', { name: 'Удалить мою оценку' }));
    const confirmation = await screen.findByRole('dialog', { name: 'Удалить публикацию?' });
    await waitFor(() => expect(confirmation).toHaveFocus());
    expect(api.remove).not.toHaveBeenCalled();
    await user.click(within(confirmation).getByRole('button', { name: 'Отмена' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('article', { name: 'Ваш отзыв' })).toHaveTextContent('Мой отзыв');
    expect(api.remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Удалить мою оценку' }));
    const reopened = await screen.findByRole('dialog', { name: 'Удалить публикацию?' });
    await waitFor(() => expect(reopened).toHaveFocus());
    await user.click(within(reopened).getByRole('button', { name: 'Удалить' }));
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith({ id: 'krel' }));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(screen.queryByRole('article', { name: 'Ваш отзыв' })).not.toBeInTheDocument();
});
