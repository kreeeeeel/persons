import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CommentsFeed } from '@persons/person-domain/CommentsFeed';
import { renderUi } from '@test/render';

const api = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), edit: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { interactions: { listComments: api.list, createComment: api.create, editComment: api.edit } },
    personError: async () => 'UNAVAILABLE',
}));

beforeEach(() => {
    vi.resetAllMocks();
    api.list.mockResolvedValue({ items: [], total: 0, page: 0, size: 10 });
    api.create.mockResolvedValue({ status: 'PENDING' });
});
afterEach(cleanup);

it.each(['photo', 'moment'] as const)('shows Slava above the empty %s comments message', async (kind) => {
    renderUi(
        <CommentsFeed
            personId="person"
            mediaId={kind === 'photo' ? 'photo' : undefined}
            momentId={kind === 'moment' ? 'moment' : undefined}
            signedIn={false}
            showHeading
            layout="media"
        />,
    );
    const text = await screen.findByText('Комментариев пока нет. Будьте первым!');
    const image = screen.getByRole('img', { name: 'Слава ждёт первый комментарий' });
    expect(image).toHaveAttribute('src', '/media/empty-comments-slava-v1.webp');
    expect(image.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('Здесь начнётся ваша история')).not.toBeInTheDocument();
});

it('submits a wall comment using the send button inside its field without a visible story label', async () => {
    renderUi(<CommentsFeed personId="person" signedIn />);
    await screen.findByText('Здесь начнётся ваша история');
    expect(screen.queryByText('Ваша история')).not.toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: 'Ваша история' });
    const send = screen.getByRole('button', { name: 'Отправить' });
    expect(send).toBeDisabled();
    expect(send.textContent).toBe('');
    expect(input.closest('[class*="field"]')).toContainElement(send);
    fireEvent.change(input, { target: { value: 'Первая история' } });
    fireEvent.click(send);
    await waitFor(() =>
        expect(api.create).toHaveBeenCalledWith({
            id: 'person',
            commentInput: { text: 'Первая история', mediaId: undefined, momentId: undefined },
        }),
    );
    await waitFor(() => expect(input).toHaveValue(''));
});

it('does not show an empty illustration when loading comments failed', async () => {
    api.list.mockRejectedValue(new Error('Offline'));
    renderUi(<CommentsFeed personId="person" mediaId="photo" signedIn={false} showHeading layout="media" />);
    await screen.findByRole('button', { name: 'Попробовать ещё раз' });
    expect(screen.queryByRole('img', { name: 'Слава ждёт первый комментарий' })).not.toBeInTheDocument();
    expect(screen.queryByText('Комментариев пока нет. Будьте первым!')).not.toBeInTheDocument();
});

it('filters personal wall posts and edits the chosen card inline with Save and Cancel', async () => {
    const row = {
        id: 'wall',
        text: 'Моя история',
        authorName: 'Автор',
        createdAt: new Date(),
        canEdit: true,
        canRemove: true,
    };
    api.list.mockResolvedValue({ items: [row], total: 1, page: 0, size: 10 });
    api.edit.mockResolvedValue({ status: 'PENDING' });
    renderUi(<CommentsFeed personId="person" signedIn />);
    await screen.findByText('Моя история');
    fireEvent.click(screen.getByRole('combobox', { name: 'Показать записи' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Мои' }));
    await waitFor(() =>
        expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ mine: true }), expect.anything()),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Редактировать' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: 'Редактирование комментария' });
    expect(screen.getByRole('textbox')).toHaveValue('Моя история');
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    fireEvent.change(input, { target: { value: 'Изменённая история' } });
    expect(api.edit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
        expect(api.edit).toHaveBeenCalledWith({ id: 'wall', commentInput: { text: 'Изменённая история' } }),
    );
});
