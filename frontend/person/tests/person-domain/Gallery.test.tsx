import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Gallery } from '@persons/person-domain/Gallery';
import { Button } from '@gravity-ui/uikit';
import { renderUi } from '@test/render';

const api = vi.hoisted(() => ({ list: vi.fn(), viewer: vi.fn(), uploader: vi.fn() }));
let intersect: IntersectionObserverCallback | undefined;
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
    intersect = undefined;
    vi.stubGlobal(
        'IntersectionObserver',
        class {
            constructor(callback: IntersectionObserverCallback) {
                intersect = callback;
            }
            observe = vi.fn();
            disconnect = vi.fn();
        },
    );
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
    vi.unstubAllGlobals();
});

it('appends the next mixed page when the scroll sentinel appears and retains existing cards', async () => {
    renderUi(<Gallery personId="person" personTag="person" signedIn />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(await screen.findByRole('button', { name: 'Photo page 0' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Video page 0' })).toBeVisible();
    expect(api.list).toHaveBeenCalledWith(
        { id: 'person', page: 0, size: 12 },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '2' })).not.toBeInTheDocument();
    act(() => intersect?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(await screen.findByRole('button', { name: 'Photo page 1' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Photo page 0' })).toBeVisible();
    expect(api.list).toHaveBeenLastCalledWith(
        { id: 'person', page: 1, size: 12 },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
});

it('preserves loaded cards after a next-page error and retries the same page', async () => {
    const load = api.list.getMockImplementation();
    if (!load) {
        throw new Error('Gallery fixture loader is missing');
    }
    api.list.mockImplementationOnce(load).mockRejectedValueOnce(new Error('Offline')).mockImplementation(load);
    renderUi(<Gallery personId="person" personTag="person" signedIn />);
    await screen.findByRole('button', { name: 'Photo page 0' });
    act(() => intersect?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    const error = await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Photo page 0' })).toBeVisible();
    fireEvent.click(within(error).getByRole('button'));
    await screen.findByRole('button', { name: 'Photo page 1' });
    expect(api.list.mock.calls.map(([request]) => request.page)).toEqual([0, 1, 1]);
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
