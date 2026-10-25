import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { ContentLike } from '@persons/person-domain/ContentLike';
import { MediaReactions } from '@persons/person-domain/MediaReactions';
import { renderUi } from '@test/render';

vi.mock('@persons/person-domain/api/browser', () => ({ personClient: {}, personError: async () => 'UNAVAILABLE' }));
afterEach(cleanup);

it.each(['COMMENT', 'RATING', 'LOAN', 'MEDIA'] as const)(
    'keeps %s counts readable without a popup or count button',
    async (kind) => {
        renderUi(
            kind === 'MEDIA' ? (
                <MediaReactions mediaId="media" initial={{ likes: 12, dislikes: 3 }} signedIn />
            ) : (
                <ContentLike id="entry" kind={kind} likes={12} dislikes={3} signedIn />
            ),
        );
        const likes = screen.getByLabelText('Кому понравилось: 12');
        const dislikes = screen.getByLabelText('Кому не понравилось: 3');
        expect(likes).toHaveTextContent('12');
        expect(dislikes).toHaveTextContent('3');
        expect(screen.queryByRole('button', { name: 'Кому понравилось: 12' })).not.toBeInTheDocument();
        await userEvent.hover(likes);
        await userEvent.hover(dislikes);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Нравится' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Не нравится' })).toBeEnabled();
    },
);
