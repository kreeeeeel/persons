import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Gallery } from '@persons/person-domain/Gallery';
import { Button } from '@gravity-ui/uikit';
import { renderUi } from '@test/render';

const api = vi.hoisted(() => ({ list: vi.fn(), viewer: vi.fn(), uploader: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { gallery: { listGallery: api.list } },
    personError: async () => 'UNAVAILABLE',
}));
vi.mock('@persons/person-domain/MediaCard', () => ({
    MediaCard: ({ item, onOpen }: { item: { title: string }; onOpen: () => void }) => (
        <Button onClick={onOpen}>{item.title}</Button>
    ),
}));
vi.mock('@persons/person-domain/MediaViewer', () => ({
    MediaViewer: (props: unknown) => {
        api.viewer(props);
        return null;
    },
}));
vi.mock('@persons/person-domain/MediaUploader', () => ({
    MediaUploader: (props: unknown) => {
        api.uploader(props);
        return null;
    },
}));

beforeEach(() => {
    api.list.mockImplementation(async ({ page }) => ({
        page,
        size: 12,
        total: 13,
        items: [
            { id: `photo-${page}`, mediaId: `photo-${page}`, kind: 'PHOTO', title: `Photo page ${page}` },
            { id: `video-${page}`, mediaId: `video-${page}`, kind: 'MOMENT', title: `Video page ${page}` },
        ],
    }));
});
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

it('loads one mixed page and changes pages through simple pagination', async () => {
    renderUi(<Gallery personId="person" personTag="person" signedIn />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(await screen.findByRole('button', { name: 'Photo page 0' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Video page 0' })).toBeVisible();
    expect(api.list).toHaveBeenCalledWith(
        { id: 'person', page: 0, size: 12 },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(await screen.findByRole('button', { name: 'Photo page 1' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Photo page 0' })).not.toBeInTheDocument();
});

it('opens the shared picker without choosing a kind and delegates cross-kind navigation to the original viewer', async () => {
    const open = vi.fn();
    renderUi(
        <Gallery
            personId="person"
            personTag="person"
            signedIn
            selectedMedia={{ id: 'photo', kind: 'PHOTO' }}
            onOpenMedia={open}
        />,
    );
    await screen.findByRole('button', { name: 'Photo page 0' });
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить' }));
    expect(api.uploader.mock.lastCall?.[0]).toEqual(expect.objectContaining({ personId: 'person' }));
    expect(api.uploader.mock.lastCall?.[0].kind).toBeUndefined();
    const viewer = api.viewer.mock.lastCall?.[0];
    expect(viewer).toEqual(expect.objectContaining({ mediaId: 'photo', kind: 'PHOTO', mixedGallery: true }));
    viewer.onNavigate('video', 'MOMENT');
    expect(open).toHaveBeenCalledWith('MOMENT', 'video');
    await waitFor(() => expect(api.list).toHaveBeenCalledOnce());
});
