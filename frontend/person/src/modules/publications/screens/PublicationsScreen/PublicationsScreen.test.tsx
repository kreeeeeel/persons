import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { MyPublication } from '@persons/person-client';
import { renderUi } from '@test/render';
import { PublicationsScreen } from '@/modules/publications/screens/PublicationsScreen/PublicationsScreen';

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', async (original) => ({
    ...(await original<typeof import('@persons/person-domain/api/browser')>()),
    personClient: { publications: { listMyPublications: mocks.list } },
}));

const entry: MyPublication = {
    id: 'comment',
    kind: 'COMMENT',
    page: { id: 'page', tag: 'vadim', fullName: 'Вадим' },
    createdAt: new Date('2026-10-22T10:00:00Z'),
    comment: {
        id: 'comment',
        authorName: 'Крел',
        text: 'Увидимся вечером',
        createdAt: new Date('2026-10-22T10:00:00Z'),
        canRemove: false,
        moderationStatus: 'PENDING',
    },
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue({ items: [entry], page: 0, size: 12, total: 1 });
});
afterEach(cleanup);

it('uses the feed card with a destination link and a pending moderation state', async () => {
    renderUi(<PublicationsScreen author={{ id: 'author', handle: 'author', fullName: 'Крел' }} signedIn />);
    const article = await screen.findByRole('article');
    expect(within(article).getByText('Увидимся вечером')).toBeVisible();
    expect(within(article).getByText('Вадим').closest('a')).toHaveAttribute('href', '/ru/person/vadim');
    expect(within(article).getByText('На модерации')).toBeVisible();
    expect(within(article).queryByRole('button', { name: /Нравится/ })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Все' })).toHaveAttribute('aria-selected', 'true');
});

it('filters by type without a search field or search query', async () => {
    renderUi(<PublicationsScreen author={{ id: 'author', handle: 'author', fullName: 'Крел' }} signedIn />);
    await screen.findByRole('article');
    mocks.list.mockResolvedValue({ items: [], page: 0, size: 12, total: 0 });
    fireEvent.click(screen.getByRole('tab', { name: 'Фотографии' }));
    await waitFor(() =>
        expect(mocks.list).toHaveBeenLastCalledWith(
            { kind: 'PHOTO', page: 0, size: 12 },
            { signal: expect.any(AbortSignal) },
        ),
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(await screen.findByText('Публикации не найдены')).toBeVisible();
});

it('shows the normal empty state in English and recovers after a failed request', async () => {
    mocks.list.mockRejectedValueOnce(new Error('unavailable'));
    mocks.list.mockResolvedValue({ items: [], page: 0, size: 12, total: 0 });
    renderUi(
        <PublicationsScreen author={{ id: 'author', handle: 'author', fullName: 'Крел' }} signedIn />,
        'en',
        'dark',
    );
    expect(await screen.findByText('Unable to load the data')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No publications yet')).toBeVisible();
    expect(screen.getByAltText('Krel prepares blank sheets for the first publications')).toHaveAttribute(
        'src',
        '/media/empty-publications-krel-v1.webp',
    );
    expect(screen.getByRole('tab', { name: 'Reviews' })).toBeVisible();
});

it('loads additional pages and resets pagination when the filter changes', async () => {
    mocks.list.mockImplementation(async ({ page, kind }: { page: number; kind?: string }) => ({
        items: kind ? [] : [{ ...entry, id: `entry-${page}`, comment: { ...entry.comment, id: `entry-${page}` } }],
        page,
        size: 1,
        total: kind ? 0 : 2,
    }));
    renderUi(<PublicationsScreen author={{ id: 'author', handle: 'author', fullName: 'Крел' }} signedIn />);
    await screen.findByRole('article');
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить ещё' }));
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2));
    fireEvent.click(screen.getByRole('tab', { name: 'Моменты' }));
    await waitFor(() =>
        expect(mocks.list).toHaveBeenLastCalledWith(
            expect.objectContaining({ page: 0, kind: 'MOMENT' }),
            expect.anything(),
        ),
    );
    expect(await screen.findByText('Публикации не найдены')).toBeVisible();
});
