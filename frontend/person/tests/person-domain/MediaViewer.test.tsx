import { useState } from 'react';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { MediaDetail } from '@persons/person-client';
import { MediaViewer } from '@persons/person-domain/MediaViewer';
import { MediaGrid } from '@persons/person-domain/MediaGrid';
import { renderUi } from '@test/render';

const api = vi.hoisted(() => ({
    detail: vi.fn(),
    view: vi.fn(),
    comments: vi.fn(),
    collection: vi.fn(),
    qualities: vi.fn(),
    remove: vi.fn(),
    createComment: vi.fn(),
}));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: {
        gallery: { getMediaDetail: api.detail, recordMediaView: api.view },
        interactions: { listComments: api.comments, createComment: api.createComment },
        persons: { listPhotos: api.collection, listMoments: api.collection },
        mediaQuality: { listMediaQualities: api.qualities },
        media: { deleteMedia: api.remove },
    },
    mediaHref: (id: string) => `/media/${id}`,
    personError: async () => 'NOT_FOUND',
}));
vi.mock('@persons/person-domain/MediaReactions', () => ({ MediaReactions: () => null }));
vi.mock('@persons/ui/useImageState', () => ({ useImageState: () => ({ ready: true }) }));
beforeEach(() => {
    vi.resetAllMocks();
    api.view.mockResolvedValue({ views: 2 });
    api.qualities.mockResolvedValue({ items: [], processing: false });
    api.comments.mockResolvedValue({ items: [], total: 0, size: 10, page: 0 });
    api.collection.mockResolvedValue({ items: [], total: 0, size: 12, page: 0 });
});
afterEach(cleanup);

const detail: MediaDetail = {
    id: 'media',
    personId: 'vadim-id',
    kind: 'PHOTO',
    caption: 'Наш вечер',
    authorName: 'Вадим',
    createdAt: new Date(),
    taggedPersons: [],
    reactions: { likes: 0, dislikes: 0 },
    comments: 0,
    durationSeconds: 0,
    previewAvailable: false,
    canEdit: false,
    canRemove: false,
    moderationStatus: 'APPROVED',
    canInteract: true,
};
function viewer(onClose = vi.fn(), kind: 'PHOTO' | 'MOMENT' = 'PHOTO') {
    return renderUi(
        <MediaViewer
            mediaId="media"
            personId="vadim-id"
            personTag="vadim"
            kind={kind}
            signedIn={false}
            onClose={onClose}
        />,
    );
}

it('opens media by ID independently from the grid page and exposes sharing for published media', async () => {
    api.detail.mockResolvedValue(detail);
    viewer();
    expect(await screen.findByRole('heading', { name: 'Наш вечер' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Поделиться' })).toBeVisible();
    await waitFor(() => expect(api.view).toHaveBeenCalledOnce());
});

function loadPhoto(image: HTMLElement, width: number, height: number) {
    Object.defineProperties(image, {
        naturalWidth: { configurable: true, value: width },
        naturalHeight: { configurable: true, value: height },
    });
    fireEvent.load(image);
}

it.each([
    { width: 900, height: 1600 },
    { width: 1600, height: 900 },
    { width: 1000, height: 1000 },
])('sizes the photo panel using the loaded $width × $height image', async ({ width, height }) => {
    api.detail.mockResolvedValue(detail);
    viewer();
    const image = await screen.findByRole('img', { name: detail.caption });
    loadPhoto(image, width, height);
    expect(image.closest('[data-kind="PHOTO"]')?.parentElement).toHaveStyle(
        `--media-photo-aspect-ratio: ${width / height}`,
    );
    expect(screen.getByRole('region', { name: 'Комментарии' })).toBeVisible();
    await waitFor(() => expect(api.view).toHaveBeenCalledOnce());
});

it('keeps the fallback photo layout until valid image dimensions are available', async () => {
    api.detail.mockResolvedValue(detail);
    viewer();
    const image = await screen.findByRole('img', { name: detail.caption });
    loadPhoto(image, 0, 0);
    expect(
        image.closest('[data-kind="PHOTO"]')?.parentElement?.style.getPropertyValue('--media-photo-aspect-ratio'),
    ).toBe('');
    loadPhoto(image, 600, 1200);
    expect(image.closest('[data-kind="PHOTO"]')?.parentElement).toHaveStyle('--media-photo-aspect-ratio: 0.5');
});

it.each([{ personId: 'another-person' }, { kind: 'MOMENT' }])(
    'rejects mismatched profile or collection before recording a view: %s',
    async (changes) => {
        api.detail.mockResolvedValue({ ...detail, ...changes });
        viewer();
        await screen.findByRole('button', { name: 'Попробовать ещё раз' });
        expect(screen.queryByRole('heading', { name: 'Наш вечер' })).not.toBeInTheDocument();
        expect(api.view).not.toHaveBeenCalled();
    },
);

it('lets the uploader view pending media without offering a public share link', async () => {
    api.detail.mockResolvedValue({ ...detail, moderationStatus: 'PENDING', canInteract: false });
    viewer();
    expect(await screen.findByText('На модерации')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Поделиться' })).not.toBeInTheDocument();
});

it('shows tagged people with their current avatar and a link to their page', async () => {
    const user = userEvent.setup();
    api.detail.mockResolvedValue({
        ...detail,
        taggedPersons: [{ id: 'krel', tag: 'krel', fullName: 'Крел', avatarMediaId: 'avatar' }],
    });
    viewer();
    const trigger = await screen.findByRole('button', { name: 'Отмечено людей: 1' });
    expect(screen.queryByRole('link', { name: /Крел/ })).not.toBeInTheDocument();
    await act(async () => {});
    await user.hover(trigger);
    const person = await screen.findByRole('link', { name: /Крел/ }, { timeout: 3000 });
    expect(person).toHaveAttribute('href', '/krel');
    expect(person.querySelector('img')).toHaveAttribute('src', '/media/avatar');
});

it.each(['PHOTO', 'MOMENT'] as const)('uses icon actions to open the editor for owned %s media', async (kind) => {
    api.detail.mockResolvedValue({ ...detail, kind, canEdit: true, canRemove: true });
    viewer(undefined, kind);
    const edit = await screen.findByRole('button', { name: 'Редактировать' });
    expect(edit.textContent).toBe('');
    expect(screen.getByRole('button', { name: 'Удалить' }).textContent).toBe('');
    expect(screen.queryByText('Подпись и отметки')).not.toBeInTheDocument();
    fireEvent.click(edit);
    expect(await screen.findByRole('textbox', { name: 'Подпись' })).toHaveValue(detail.caption);
});

it.each([
    { kind: 'PHOTO', status: 'APPROVED', closes: true },
    { kind: 'MOMENT', status: 'PENDING', closes: false },
] as const)('preserves $status deletion behavior behind the $kind trash icon', async ({ kind, status, closes }) => {
    const user = userEvent.setup();
    const close = vi.fn();
    api.detail.mockResolvedValue({ ...detail, kind, canRemove: true });
    api.remove.mockResolvedValue({ status });
    viewer(close, kind);
    const mediaDialog = screen.getByRole('dialog', { name: 'Просмотр медиа' });
    await waitFor(() => expect(mediaDialog).toHaveFocus());
    await user.click(await within(mediaDialog).findByRole('button', { name: 'Удалить' }));
    expect(api.remove).not.toHaveBeenCalled();
    const confirmation = await screen.findByRole('dialog', { name: 'Удалить публикацию?' });
    await waitFor(() => expect(confirmation).toHaveFocus());
    await user.click(await within(confirmation).findByRole('button', { name: 'Удалить' }));
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith({ id: 'media' }));
    await waitFor(() => {
        if (closes) {
            expect(close).toHaveBeenCalledOnce();
        } else {
            expect(screen.getByText(/Отправлено на модерацию/)).toBeVisible();
        }
    });
    if (!closes) {
        expect(close).not.toHaveBeenCalled();
    }
});

it('does not offer media management actions without server permissions', async () => {
    api.detail.mockResolvedValue(detail);
    viewer();
    await screen.findByRole('heading', { name: detail.caption });
    expect(screen.queryByRole('button', { name: 'Редактировать' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Удалить' })).not.toBeInTheDocument();
});

it.each(['PHOTO', 'MOMENT'] as const)(
    'submits a %s comment from the bottom composer and retains the pending comment',
    async (kind) => {
        api.detail.mockResolvedValue({ ...detail, kind });
        api.createComment.mockImplementation(async () => {
            api.comments.mockResolvedValue({
                items: [
                    {
                        id: 'own-comment',
                        authorName: 'Крел',
                        text: 'Надо повторить!',
                        createdAt: new Date(),
                        moderationStatus: 'PENDING',
                        canRemove: true,
                    },
                ],
                total: 1,
                page: 0,
                size: 10,
            });
            return { status: 'PENDING' };
        });
        renderUi(
            <MediaViewer
                mediaId="media"
                personId="vadim-id"
                personTag="vadim"
                kind={kind}
                signedIn
                onClose={vi.fn()}
            />,
        );
        const input = await screen.findByRole('textbox', { name: 'Ваш комментарий' });
        expect(screen.queryByText('Ваш комментарий')).not.toBeInTheDocument();
        expect(screen.queryByText('Материалы на проверке видят только автор и модераторы.')).not.toBeInTheDocument();
        fireEvent.change(input, { target: { value: 'Надо повторить!' } });
        const send = screen.getByRole('button', { name: 'Отправить' });
        expect(input.closest('form')).toContainElement(send);
        fireEvent.click(send);
        await waitFor(() =>
            expect(api.createComment).toHaveBeenCalledWith({
                id: 'vadim-id',
                commentInput: { text: 'Надо повторить!', mediaId: 'media', momentId: undefined },
            }),
        );
        expect(await screen.findByText('Надо повторить!')).toBeVisible();
        expect(input).toHaveValue('');
        expect(screen.getByRole('heading', { name: 'Комментарии · 1' })).toBeVisible();
        expect(screen.getAllByText(/На модерации|На проверке/).length).toBeGreaterThan(0);
        const textNode = screen.getByText('Надо повторить!');
        expect(textNode.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    },
);

function Gallery({ kind, onClose }: { kind: 'PHOTO' | 'MOMENT'; onClose: () => void }) {
    const [selected, setSelected] = useState('media');

    return (
        <MediaGrid
            personId="vadim-id"
            personTag="vadim"
            kind={kind}
            signedIn
            selectedMediaId={selected}
            onOpenMedia={setSelected}
            onCloseMedia={onClose}
        />
    );
}

it.each(['PHOTO', 'MOMENT'] as const)(
    'keeps one dialog through %s navigation and loading, resets media state, and sorts only its comments',
    async (kind) => {
        const next = Promise.withResolvers<MediaDetail>();
        const onClose = vi.fn();
        api.detail.mockImplementation(({ id }: { id: string }) =>
            id === 'next' ? next.promise : Promise.resolve({ ...detail, kind, nextMediaId: 'next' }),
        );
        renderUi(<Gallery kind={kind} onClose={onClose} />);
        await screen.findByRole('heading', { name: 'Наш вечер' });
        const dialog = screen.getByRole('dialog', { name: 'Просмотр медиа' });
        if (kind === 'PHOTO') {
            loadPhoto(screen.getByRole('img', { name: 'Наш вечер' }), 900, 1600);
        }
        const comments = within(screen.getByRole('region', { name: 'Комментарии' }));
        fireEvent.click(comments.getByRole('combobox', { name: 'Сортировка' }));
        fireEvent.click(screen.getByRole('option', { name: 'Больше лайков' }));
        await waitFor(() =>
            expect(api.comments).toHaveBeenLastCalledWith(
                expect.objectContaining({ mediaId: 'media', page: 0, sort: 'MOST_LIKED' }),
                expect.anything(),
            ),
        );
        fireEvent.change(comments.getByRole('textbox', { name: 'Ваш комментарий' }), {
            target: { value: 'Черновик только для первого медиа' },
        });
        expect(screen.queryByRole('button', { name: 'Предыдущее медиа' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Следующее медиа' }));
        await waitFor(() => expect(api.detail).toHaveBeenLastCalledWith({ id: 'next' }, expect.anything()));
        expect(screen.getByRole('dialog', { name: 'Просмотр медиа' })).toBe(dialog);
        expect(screen.getByRole('status', { name: 'Загрузка…' })).toBeVisible();
        await act(async () => {
            next.resolve({ ...detail, id: 'next', kind, caption: 'Следующий вечер', previousMediaId: 'media' });
        });
        await screen.findByRole('heading', { name: 'Следующий вечер' });
        expect(screen.getByRole('dialog', { name: 'Просмотр медиа' })).toBe(dialog);
        if (kind === 'PHOTO') {
            const image = screen.getByRole('img', { name: 'Следующий вечер' });
            expect(
                image
                    .closest('[data-kind="PHOTO"]')
                    ?.parentElement?.style.getPropertyValue('--media-photo-aspect-ratio'),
            ).toBe('');
            loadPhoto(image, 1600, 900);
            expect(image.closest('[data-kind="PHOTO"]')?.parentElement).toHaveStyle(
                `--media-photo-aspect-ratio: ${1600 / 900}`,
            );
        }
        expect(screen.getAllByRole('dialog')).toHaveLength(1);
        expect(screen.getByRole('textbox', { name: 'Ваш комментарий' })).toHaveValue('');
        await waitFor(() =>
            expect(api.comments).toHaveBeenLastCalledWith(
                expect.objectContaining({ mediaId: 'next', page: 0, sort: 'NEWEST' }),
                expect.anything(),
            ),
        );
        expect(screen.queryByRole('button', { name: 'Следующее медиа' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Предыдущее медиа' }));
        await screen.findByRole('heading', { name: 'Наш вечер' });
        expect(screen.getByRole('dialog', { name: 'Просмотр медиа' })).toBe(dialog);
        expect(onClose).not.toHaveBeenCalled();
    },
);
