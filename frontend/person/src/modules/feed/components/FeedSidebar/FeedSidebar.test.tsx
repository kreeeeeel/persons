import { cleanup, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { FeedSidebar } from '@/modules/feed/components/FeedSidebar/FeedSidebar';

const api = vi.hoisted(() => ({ recommend: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', async (original) => ({
    ...(await original<typeof import('@persons/person-domain/api/browser')>()),
    personClient: { persons: { recommendPersons: api.recommend } },
}));
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

it('loads recommendations, excludes the linked page and keeps the more people link', async () => {
    api.recommend.mockResolvedValue([
        { id: 'self', fullName: 'Моя страница', tag: 'self' },
        { id: 'friend', fullName: 'Вадим', tag: 'vadim' },
    ]);
    renderUi(<FeedSidebar ownPageId="self" />);
    expect(await screen.findByRole('link', { name: /Вадим/ })).toHaveAttribute('href', '/ru/person/vadim');
    expect(screen.queryByText('Моя страница')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ещё люди' })).toHaveAttribute('href', '/ru/people');
    expect(api.recommend).toHaveBeenCalledWith({ size: 5 }, { signal: expect.any(AbortSignal) });
});

it('retries failed recommendations instead of falling back to a fixed demo list', async () => {
    api.recommend.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
    renderUi(<FeedSidebar />, 'en', 'dark');
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('No recommendations yet')).toBeVisible());
    expect(screen.getByRole('link', { name: 'More people' })).toBeVisible();
    expect(screen.getByAltText('Artem searches an empty card catalogue with a magnifying glass')).toHaveAttribute(
        'src',
        '/media/empty-search-artem-v1.webp',
    );
});
