import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { DirectoryEntry } from '@persons/person-client';
import { renderUi } from '@test/render';
import { DirectoryScreen } from '@/modules/directory/screens/DirectoryScreen/DirectoryScreen';

const api = vi.hoisted(() => ({ list: vi.fn() }));
const observed = vi.hoisted(() => ({ intersect: undefined as undefined | IntersectionObserverCallback }));
vi.mock('next/navigation', () => ({ usePathname: () => null }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { persons: { listDirectory: api.list } },
    personError: async () => 'UNAVAILABLE',
    mediaHref: (id: string) => `/media/${id}`,
}));
vi.mock('@persons/person-domain/settings/useSiteSettings', () => ({
    useSiteSettings: () => ({ data: { catalogPageSize: 3 } }),
}));
const people: DirectoryEntry[] = Array.from({ length: 6 }, (_, index) => ({
    id: `person-${index}`,
    tag: `friend-${index}`,
    fullName: `Человек ${index}`,
    views: index,
    photos: index + 1,
    moments: index + 2,
    ratingAverage: index ? undefined : 4.2,
    avatarMediaId: index ? undefined : 'avatar',
}));
beforeEach(() => {
    observed.intersect = undefined;
    api.list.mockReset().mockImplementation(async ({ page, size }) => ({
        items: people.slice(page * size, (page + 1) * size),
        page,
        size,
        total: people.length,
    }));
    vi.stubGlobal(
        'IntersectionObserver',
        class {
            constructor(callback: IntersectionObserverCallback) {
                observed.intersect = callback;
            }
            observe = vi.fn();
            disconnect = vi.fn();
        },
    );
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

it('loads real pages through the generated API and requests the selected server order', async () => {
    renderUi(<DirectoryScreen />);
    await screen.findByRole('heading', { name: 'Человек 0' });
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3);
    expect(api.list).toHaveBeenCalledWith({ page: 0, size: 3, order: 'VIEWS' }, { signal: expect.any(AbortSignal) });
    await waitFor(() => expect(observed.intersect).toBeTypeOf('function'));
    await act(async () => {
        observed.intersect?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    await waitFor(() => expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(6));
    expect(api.list).toHaveBeenCalledWith({ page: 1, size: 3, order: 'VIEWS' }, { signal: expect.any(AbortSignal) });
    fireEvent.click(screen.getByRole('combobox', { name: 'Сначала показывать' }));
    fireEvent.click(screen.getByRole('option', { name: 'По имени' }));
    await waitFor(() =>
        expect(api.list).toHaveBeenCalledWith({ page: 0, size: 3, order: 'NAME' }, { signal: expect.any(AbortSignal) }),
    );
    await waitFor(() => expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3));
});

it('uses the actual name, avatar and counts without inventing a missing rating', async () => {
    renderUi(<DirectoryScreen />, 'en', 'dark');
    const card = await screen.findByRole('link', { name: 'Open card: Человек 0' });
    expect(card).toHaveAttribute('href', '/en/person/friend-0');
    expect(card.querySelector('img')).toHaveAttribute('src', '/media/avatar');
    expect(card.querySelector('[aria-label="1 photos"]')).toBeInTheDocument();
    expect(card.querySelector('[aria-label="2 moments"]')).toBeInTheDocument();
    expect(card.querySelector('[aria-label="Rating: 4.2"]')).toBeInTheDocument();
    expect(
        screen.getByRole('link', { name: 'Open card: Человек 1' }).querySelector('[aria-label="Rating: —"]'),
    ).toBeInTheDocument();
    expect(card.querySelector('button')).toBeNull();
});

it('shows real empty and failure states without falling back to demonstration profiles', async () => {
    api.list.mockResolvedValueOnce({ items: [], total: 0, page: 0, size: 3 });
    const view = renderUi(<DirectoryScreen />);
    await screen.findByText('Пока никого не нашли');
    expect(screen.queryByRole('link', { name: /Открыть карточку/ })).not.toBeInTheDocument();
    view.unmount();
    api.list.mockRejectedValueOnce(new Error('Offline'));
    renderUi(<DirectoryScreen />);
    await screen.findByRole('button', { name: 'Попробовать ещё раз' });
    expect(screen.queryByRole('link', { name: /Открыть карточку/ })).not.toBeInTheDocument();
});
