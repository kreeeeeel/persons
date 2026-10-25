import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { MediaReactions } from '@persons/person-domain/MediaReactions';

const api = vi.hoisted(() => ({ react: vi.fn(), clear: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: {
        gallery: { reactToMedia: api.react, removeMediaReaction: api.clear },
    },
    personError: async () => 'UNAVAILABLE',
}));
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it('switches from like to dislike and can remove the current reaction', async () => {
    api.react.mockResolvedValue({ likes: 0, dislikes: 1, reaction: 'DISLIKE' });
    api.clear.mockResolvedValue({ likes: 0, dislikes: 0 });
    renderUi(<MediaReactions mediaId="photo" signedIn initial={{ likes: 1, dislikes: 0, reaction: 'LIKE' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Не нравится' }));
    await waitFor(() =>
        expect(api.react).toHaveBeenCalledWith({
            id: 'photo',
            mediaReactionInput: { reaction: 'DISLIKE' },
        }),
    );
    await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Не нравится' })).toHaveAttribute('aria-pressed', 'true'),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Не нравится' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Не нравится' }));
    await waitFor(() => expect(api.clear).toHaveBeenCalledWith({ id: 'photo' }));
    await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Не нравится' })).toHaveAttribute('aria-pressed', 'false'),
    );
});
