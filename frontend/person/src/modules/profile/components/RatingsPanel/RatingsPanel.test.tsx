import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { RatingsPanel } from '@/modules/profile/components/RatingsPanel/RatingsPanel';

const api = vi.hoisted(() => ({ rate: vi.fn(), remove: vi.fn(), list: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { interactions: { ratePerson: api.rate, removeRating: api.remove, listRatings: api.list } },
    personError: async () => 'UNAVAILABLE',
}));
const options = [{ id: 'violet', emoji: '💜', label: 'Свой', count: 0, selected: false }];

beforeEach(() => {
    vi.clearAllMocks();
    api.list.mockResolvedValue({ items: [], total: 0, page: 0, size: 12 });
});
afterEach(cleanup);

it('submits a numeric rating out of five with the chosen emoji and updates the average', async () => {
    api.rate.mockResolvedValue({ options, average: 4, total: 1, value: 4, optionId: 'violet' });
    renderUi(<RatingsPanel personId="friend" signedIn initialOptions={options} onChange={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: /^Поставить/ })).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Поставить 4 из 5' }));
    expect(api.rate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    await waitFor(() =>
        expect(api.rate).toHaveBeenCalledWith({
            id: 'friend',
            ratingInput: { optionId: 'violet', value: 4, comment: '' },
        }),
    );
    await waitFor(() => expect(screen.getByRole('article', { name: 'Ваш отзыв' })).toBeVisible());
    expect(screen.queryByText('1 оценка')).not.toBeInTheDocument();
});

it('keeps rating controls unavailable to anonymous visitors', () => {
    renderUi(<RatingsPanel personId="friend" signedIn={false} initialOptions={options} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Поставить 5 из 5' })).toBeDisabled();
    expect(api.rate).not.toHaveBeenCalled();
});

it('places a compact emoji dropdown immediately before the send button inside the comment field', () => {
    renderUi(<RatingsPanel personId="friend" signedIn initialOptions={options} onChange={vi.fn()} />);
    const score = screen.getByRole('group', { name: 'Оценка от одного до пяти' });
    const emoji = screen.getByRole('button', { name: 'Эмодзи оценки' });
    const send = screen.getByRole('button', { name: 'Отправить' });
    const comment = screen.getByLabelText('Комментарий к оценке · необязательно');
    expect(comment).toHaveAttribute('placeholder', 'Расскажите, почему поставили такую оценку…');
    expect(screen.queryByText('Выберите эмодзи для оценки')).not.toBeInTheDocument();
    expect(score.compareDocumentPosition(comment) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(comment.closest('form')).toContainElement(emoji);
    expect(emoji.nextElementSibling).toBe(send);
    expect(send).toBeDisabled();
});

it('submits an optional review and shows its moderation status to the author', async () => {
    api.rate.mockResolvedValue({ options, value: 5, total: 1, comment: 'Отличная компания', commentStatus: 'PENDING' });
    renderUi(<RatingsPanel personId="friend" signedIn initialOptions={options} onChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Комментарий к оценке · необязательно'), {
        target: { value: 'Отличная компания' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Поставить 5 из 5' }));
    expect(api.rate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    await waitFor(() =>
        expect(api.rate).toHaveBeenCalledWith({
            id: 'friend',
            ratingInput: { optionId: 'violet', value: 5, comment: 'Отличная компания' },
        }),
    );
    expect(await screen.findByText('На модерации')).toBeVisible();
});

it('allows clearing an optional comment while keeping the existing rating', async () => {
    api.rate.mockResolvedValue({ options, value: 4, total: 1, comment: '' });
    renderUi(
        <RatingsPanel
            personId="friend"
            signedIn
            initialOptions={options}
            initialRating={{ options, value: 4, optionId: 'violet', comment: 'Прежний отзыв' }}
            onChange={vi.fn()}
        />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Редактировать' }));
    fireEvent.change(screen.getByLabelText('Комментарий к оценке · необязательно'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
        expect(api.rate).toHaveBeenCalledWith({
            id: 'friend',
            ratingInput: { optionId: 'violet', value: 4, comment: '' },
        }),
    );
});

it('keeps emoji edits local, cancels without changing the saved review and hides its duplicate', async () => {
    api.list.mockResolvedValue({
        items: [
            {
                id: 'mine',
                value: 4,
                emoji: '💜',
                comment: 'Мой отзыв',
                authorName: 'Я',
                mine: true,
                createdAt: new Date(),
            },
            { id: 'other', value: 3, emoji: '⭐', comment: 'Чужой отзыв', authorName: 'Друг', createdAt: new Date() },
        ],
        total: 2,
        page: 0,
        size: 12,
    });
    renderUi(
        <RatingsPanel
            personId="friend"
            signedIn
            initialOptions={options}
            initialRating={{
                options,
                value: 4,
                optionId: 'violet',
                emoji: '💜',
                comment: 'Мой отзыв',
                availableEmojis: ['💜', '🐰'],
            }}
            onChange={vi.fn()}
        />,
    );
    expect(await screen.findByText('Чужой отзыв')).toBeVisible();
    expect(screen.getAllByText('Мой отзыв')).toHaveLength(1);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Редактировать' }));
    fireEvent.click(screen.getByRole('button', { name: 'Эмодзи оценки' }));
    fireEvent.click(await screen.findByRole('option', { name: '🐰' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Черновик' } });
    expect(api.rate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    const review = screen.getByRole('article', { name: 'Ваш отзыв' });
    expect(within(review).getByText('Мой отзыв')).toBeVisible();
    expect(within(review).getByLabelText('Оценка: 4 из 5')).toHaveTextContent('💜💜💜💜');
    const remove = within(review).getByRole('button', { name: 'Удалить мою оценку' });
    expect(remove.textContent).toBe('');
});

it('keeps an edited review available after a failed save', async () => {
    api.rate.mockRejectedValue(new Error('offline'));
    renderUi(
        <RatingsPanel
            personId="friend"
            signedIn
            initialOptions={options}
            initialRating={{ options, value: 4, optionId: 'violet', comment: 'Прежний отзыв' }}
            onChange={vi.fn()}
        />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Редактировать' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Новый отзыв' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(api.rate).toHaveBeenCalledOnce());
    expect(screen.getByRole('textbox')).toHaveValue('Новый отзыв');
    expect(screen.queryByRole('article', { name: 'Ваш отзыв' })).not.toBeInTheDocument();
});
