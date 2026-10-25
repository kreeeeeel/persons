import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { MediaCard } from '@persons/person-domain/MediaCard';

afterEach(cleanup);

it('shows a video duration on its thumbnail and opens the shared viewer on click', () => {
    const onOpen = vi.fn();
    renderUi(
        <MediaCard
            kind="MOMENT"
            onOpen={onOpen}
            item={{
                id: 'moment',
                mediaId: 'video',
                title: 'Наш раунд',
                authorName: 'Крел',
                createdAt: new Date(),
                likes: 0,
                liked: false,
                comments: 0,
                canRemove: false,
                durationSeconds: 4,
                previewAvailable: true,
                views: 128,
            }}
        />,
    );
    expect(screen.getByText('00:04')).toBeVisible();
    expect(screen.getByLabelText('Просмотры: 128')).toHaveTextContent('128');
    fireEvent.click(screen.getByRole('button', { name: 'Наш раунд' }));
    expect(onOpen).toHaveBeenCalledOnce();
});

it('can omit its view count when the surrounding feed card already displays it', () => {
    renderUi(
        <MediaCard
            kind="PHOTO"
            showViews={false}
            onOpen={vi.fn()}
            item={{
                id: 'photo',
                mediaId: 'image',
                title: 'Вся компания',
                views: 128,
                createdAt: new Date(),
                canRemove: false,
            }}
        />,
    );
    expect(screen.queryByLabelText('Просмотры: 128')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Вся компания' })).toBeInTheDocument();
});

it('uses the photo caption as the accessible name of its preview', () => {
    const onOpen = vi.fn();
    renderUi(
        <MediaCard
            kind="PHOTO"
            onOpen={onOpen}
            item={{ id: 'photo', mediaId: 'image', title: 'Вся компания', createdAt: new Date(), canRemove: false }}
        />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Вся компания' }));
    expect(onOpen).toHaveBeenCalledOnce();
});
