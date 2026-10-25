import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ContentLike } from '@persons/person-domain/ContentLike';
import { renderUi } from '@test/render';

const api = vi.hoisted(() => ({ react: vi.fn(), clear: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { engagement: { reactToContent: api.react, clearContentReaction: api.clear } },
    personError: async () => 'UNAVAILABLE',
}));
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it.each(['COMMENT', 'RATING', 'LOAN'] as const)('toggles a %s like using the returned count', async (kind) => {
    api.react.mockResolvedValue({ count: 3, liked: true, dislikes: 0, disliked: false });
    api.clear.mockResolvedValue({ count: 2, liked: false, dislikes: 0, disliked: false });
    renderUi(<ContentLike kind={kind} id="entry" likes={2} signedIn />);
    fireEvent.click(screen.getByRole('button', { name: 'Нравится' }));
    await waitFor(() =>
        expect(api.react).toHaveBeenCalledWith({ kind, id: 'entry', contentReactionInput: { reaction: 'LIKE' } }),
    );
    const remove = await screen.findByRole('button', { name: 'Убрать лайк' });
    await waitFor(() => expect(remove).toBeEnabled());
    expect(screen.getByLabelText('Кому понравилось: 3')).toHaveTextContent('3');
    fireEvent.click(remove);
    await waitFor(() => expect(api.clear).toHaveBeenCalledWith({ kind, id: 'entry' }));
    expect(await screen.findByLabelText('Кому понравилось: 2')).toHaveTextContent('2');
});

it('keeps pending content read only and preserves the vote when a request fails', async () => {
    const view = renderUi(<ContentLike kind="COMMENT" id="pending" signedIn disabled />);
    expect(screen.getByRole('button', { name: 'Нравится' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Не нравится' })).toBeDisabled();
    expect(api.react).not.toHaveBeenCalled();
    view.unmount();
    api.react.mockRejectedValue(new Error('offline'));
    renderUi(<ContentLike kind="COMMENT" id="live" likes={8} signedIn />);
    fireEvent.click(screen.getByRole('button', { name: 'Нравится' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Нравится' })).toBeEnabled());
    expect(screen.getByLabelText('Кому понравилось: 8')).toHaveTextContent('8');
    expect(await screen.findByText('Не удалось связаться с сервисом. Попробуйте ещё раз.')).toBeVisible();
});

it.each(['COMMENT', 'RATING', 'LOAN'] as const)(
    'switches a %s like to a dislike and removes it on the next click',
    async (kind) => {
        api.react.mockResolvedValue({ count: 1, liked: false, dislikes: 3, disliked: true });
        api.clear.mockResolvedValue({ count: 1, liked: false, dislikes: 2, disliked: false });
        renderUi(<ContentLike kind={kind} id="entry" likes={2} liked dislikes={2} signedIn />);
        fireEvent.click(screen.getByRole('button', { name: 'Не нравится' }));
        await waitFor(() =>
            expect(api.react).toHaveBeenCalledWith({
                kind,
                id: 'entry',
                contentReactionInput: { reaction: 'DISLIKE' },
            }),
        );
        const remove = await screen.findByRole('button', { name: 'Убрать дизлайк' });
        await waitFor(() => expect(remove).toBeEnabled());
        expect(screen.getByLabelText('Кому не понравилось: 3')).toHaveTextContent('3');
        expect(screen.getByRole('button', { name: 'Нравится' })).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(remove);
        await waitFor(() => expect(api.clear).toHaveBeenCalledWith({ kind, id: 'entry' }));
        expect(await screen.findByLabelText('Кому не понравилось: 2')).toHaveTextContent('2');
    },
);
