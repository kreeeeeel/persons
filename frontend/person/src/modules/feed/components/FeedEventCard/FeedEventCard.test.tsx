import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { FeedEventCard } from '@/modules/feed/components/FeedEventCard/FeedEventCard';
import { previewMatches } from '@/modules/integrations/model/previewMatches';
import { previewCsMatches } from '@/modules/integrations/model/previewCsMatches';
import { previewPages } from '@test/fixtures/previewPages';

const api = vi.hoisted(() => ({
    detail: vi.fn(),
    comments: vi.fn(),
    view: vi.fn(),
    qualities: vi.fn(),
    react: vi.fn(),
}));
vi.mock('@persons/person-domain/api/browser', async (original) => {
    const actual = await original<typeof import('@persons/person-domain/api/browser')>();
    return {
        ...actual,
        personClient: {
            ...actual.personClient,
            gallery: { getMediaDetail: api.detail, recordMediaView: api.view },
            interactions: { listComments: api.comments },
            mediaQuality: { listMediaQualities: api.qualities },
            engagement: { reactToContent: api.react },
        },
    };
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

it.each([
    ['ru', 'light', 'получил достижение'],
    ['en', 'dark', 'earned an achievement'],
] as const)('shows the achievement action beside the person name in %s/%s', (locale, theme, actionText) => {
    const page = previewPages[0];
    const createdAt = new Date('2026-10-19T08:46:31Z');
    renderUi(
        <FeedEventCard
            event={{
                id: 'achievement',
                kind: 'achievement',
                page,
                createdAt,
                content: {
                    id: 'grant',
                    assignedAt: createdAt,
                    note: '',
                    achievement: {
                        id: 'award',
                        title: 'Award',
                        description: 'Description',
                        active: true,
                        type: 'MANUAL',
                        createdAt,
                        version: 0,
                    },
                },
            }}
            signedIn
            onChanged={vi.fn()}
        />,
        locale,
        theme,
    );
    const article = screen.getByRole('article');
    const pageLink = within(article).getByRole('link');
    const action = within(article).getByText(actionText);
    expect(action).toBeVisible();
    expect(pageLink.nextElementSibling).toBe(action);
    expect(pageLink).toHaveAttribute('href', `/${locale}/person/${page.tag}`);
    expect(pageLink).toHaveTextContent(page.fullName);
    expect(pageLink).not.toHaveTextContent(actionText);
    expect(article.querySelector('time')).toHaveAttribute('datetime', createdAt.toISOString());
});

it('shows a CS match with the Counter-Strike icon and shared match dialog', async () => {
    const user = userEvent.setup();
    const match = previewCsMatches[0];
    renderUi(
        <FeedEventCard
            event={{
                id: 'cs',
                kind: 'game',
                game: 'cs2',
                page: previewPages[0],
                content: match,
                createdAt: new Date(match.playedAt),
            }}
            signedIn
            onChanged={vi.fn()}
        />,
    );
    const article = screen.getByRole('article');
    expect(within(article).getByText('Counter-Strike 2')).toBeVisible();
    expect(article.querySelector('img[src$="cs2-logo.svg"]')).toBeInTheDocument();
    await user.click(within(article).getByRole('button', { name: /Mirage/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Победа')).toBeVisible();
    expect(within(dialog).getByText('13:9')).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Поделиться' })).toBeEnabled();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it.each(['PHOTO', 'MOMENT'] as const)('shows a compact %s comment and loads media only when opened', async (kind) => {
    const user = userEvent.setup();
    api.comments.mockResolvedValue({ items: [], total: 0, size: 10, page: 0 });
    api.view.mockResolvedValue({ views: 20 });
    api.qualities.mockResolvedValue({ items: [], processing: false });
    const mediaDate = new Date('2026-10-20T12:00:00Z');
    const commentDate = new Date('2026-10-22T10:00:00Z');
    api.detail.mockResolvedValue({
        id: 'source-media',
        personId: previewPages[0].id,
        kind,
        caption: 'Исходная публикация',
        authorName: 'Загрузивший',
        createdAt: mediaDate,
        taggedPersons: [],
        reactions: { likes: 10, dislikes: 1 },
        comments: 4,
        canEdit: false,
        canRemove: false,
        canInteract: true,
        views: 20,
        previewAvailable: true,
        durationSeconds: 20,
        moderationStatus: 'APPROVED',
    });
    renderUi(
        <FeedEventCard
            event={{
                id: 'media-comment',
                kind: 'comment',
                page: previewPages[0],
                createdAt: commentDate,
                contextMediaKind: kind,
                content: {
                    id: 'comment',
                    mediaId: 'source-media',
                    authorName: 'Анастасия Николаева',
                    text: 'Мой комментарий к публикации',
                    createdAt: commentDate,
                    canRemove: false,
                    likes: 3,
                    moderationStatus: 'APPROVED',
                },
            }}
            signedIn
            onChanged={vi.fn()}
        />,
    );
    const article = screen.getByRole('article');
    expect(article).toHaveAttribute('data-kind', kind === 'PHOTO' ? 'photo' : 'moment');
    expect(within(article).queryByText('Загрузивший')).not.toBeInTheDocument();
    expect(within(article).getByText('Анастасия Н.')).toHaveAttribute('title', 'Анастасия Николаева');
    expect(within(article).getByText(kind === 'PHOTO' ? 'фотографию' : 'момент')).toBeVisible();
    expect(within(article).getByText('Мой комментарий к публикации')).toBeVisible();
    expect([...article.querySelectorAll('time')].map((time) => time.dateTime)).toEqual([commentDate.toISOString()]);
    expect(api.detail).not.toHaveBeenCalled();
    api.react.mockResolvedValue({ count: 4, liked: true, dislikes: 0, disliked: false });
    await user.click(within(article).getByRole('button', { name: /Нравится/ }));
    expect(api.react).toHaveBeenCalledWith({
        kind: 'COMMENT',
        id: 'comment',
        contentReactionInput: { reaction: 'LIKE' },
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.detail).not.toHaveBeenCalled();
    const open = within(article).getByRole('button', { name: /Открыть (фотографию|момент) с комментарием/ });
    open.focus();
    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog', { name: 'Просмотр медиа' });
    expect(await within(dialog).findByRole('heading', { name: 'Исходная публикация' })).toBeVisible();
    expect(api.detail).toHaveBeenLastCalledWith({ id: 'source-media' }, { signal: expect.any(AbortSignal) });
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it.each(['ru', 'en'] as const)(
    'shows the match action beside the page name and opens shared details in %s',
    async (locale) => {
        const user = userEvent.setup();
        const match = previewMatches[0];
        const page = previewPages[0];
        renderUi(
            <FeedEventCard
                event={{ id: 'match', kind: 'game', page, content: match, createdAt: new Date(match.playedAt) }}
                signedIn
                onChanged={vi.fn()}
            />,
            locale,
        );
        const article = screen.getByRole('article');
        expect(within(article).getByText(page.fullName)).toBeVisible();
        expect(
            within(article).getByText(locale === 'ru' ? 'сыграл матч в' : 'played a match in', { exact: false }),
        ).toBeVisible();
        expect(within(article).getByText('Dota 2')).toBeVisible();
        expect(article.querySelector('img[src$="dota-logo.svg"]')).toBeInTheDocument();
        expect(article.querySelector('time')).toHaveAttribute('datetime', new Date(match.playedAt).toISOString());
        expect(within(article).queryByText(/сыграл матч на|played a match as/)).not.toBeInTheDocument();
        await user.click(within(article).getByRole('button', { name: /Juggernaut/ }));
        expect(within(screen.getByRole('dialog')).getByRole('img', { name: 'Telescope' })).toBeVisible();
        expect(
            within(screen.getByRole('dialog')).queryByRole('button', {
                name: locale === 'ru' ? 'Поделиться' : 'Share',
            }),
        ).not.toBeInTheDocument();
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    },
);
