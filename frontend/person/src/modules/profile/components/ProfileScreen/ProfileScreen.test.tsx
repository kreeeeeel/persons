import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';
import type { PersonProfile } from '@persons/person-client';
import { Button } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import { ProfileScreen } from '@/modules/profile/components/ProfileScreen/ProfileScreen';
import { renderUi } from '@test/render';
import { previewCsMatches } from '@/modules/integrations/model/previewCsMatches';

const api = vi.hoisted(() => ({
    rate: vi.fn(),
    list: vi.fn(),
    profile: vi.fn(),
    view: vi.fn(),
    routeRefresh: vi.fn(),
    replace: vi.fn(),
    settings: vi.fn(),
    games: vi.fn().mockResolvedValue({ items: [], page: 0, size: 12, total: 0 }),
    csGames: vi.fn().mockResolvedValue({ items: [], page: 0, size: 12, total: 0 }),
    csMatch: vi.fn(),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: api.routeRefresh, replace: api.replace }),
    usePathname: () => '/krel',
    useSearchParams: () => null,
}));
vi.mock('@persons/person-domain/PersonAdminTools', () => ({
    PersonAdminTools: ({ onSaved }: { onSaved: (tag: string) => void }) => {
        const t = useTranslate('person');
        return (
            <Button size="l" onClick={() => onSaved('new-tag')}>
                {t('editPage')}
            </Button>
        );
    },
}));
vi.mock('@/shared/ui/SiteHeader/SiteHeader', () => ({ SiteHeader: ({ children }: PropsWithChildren) => children }));
vi.mock('@/modules/profile/components/CommentsPanel/CommentsPanel', () => ({ CommentsPanel: () => null }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: {
        games: { listDotaMatches: api.games, listCsMatches: api.csGames, getCsMatch: api.csMatch },
        siteSettings: { getSiteSettings: api.settings },
        interactions: { ratePerson: api.rate, listRatings: api.list },
        persons: { getPerson: api.profile, recordView: api.view },
    },
    mediaHref: (id: string) => `/media/${id}`,
    personError: async () => 'UNAVAILABLE',
}));
beforeEach(() => {
    api.settings.mockResolvedValue({ marqueeEnabled: false });
    api.view.mockResolvedValue(undefined);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
});

const rating = { options: [], availableEmojis: ['⭐', '🐰'], value: 3, emoji: '⭐', comment: '' };
const profile: PersonProfile = {
    id: 'krel',
    tag: 'krel',
    fullName: 'Крел',
    firstName: 'Крел',
    lastName: '',
    description: '',
    tags: [],
    socialLinks: [],
    ratingOptions: [],
    rating,
    canEdit: false,
    version: 1,
    stats: {
        comments: 0,
        ratings: 1,
        ratingAverage: 3,
        views: 0,
        moments: 0,
        photos: 0,
        creditEntries: 0,
        creditScore: 0,
        reputation: 'GOOD',
    },
};

it('shows games on a normal profile and selects them directly for the design review link', () => {
    const { unmount } = renderUi(<ProfileScreen profile={profile} signedIn={false} account={null} />);
    expect(screen.getByRole('tab', { name: 'Игры' })).toHaveAttribute('aria-selected', 'false');
    unmount();
    renderUi(<ProfileScreen profile={profile} signedIn={false} account={null} integrationsPreview />);
    expect(screen.getByRole('tab', { name: 'Игры' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'OpenDota' })).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Стена' }));
    expect(screen.queryByRole('tab', { name: 'OpenDota' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Игры' }));
    expect(screen.getByRole('tab', { name: 'OpenDota' })).toBeVisible();
});

it('opens the games section and shared CS match from the profile URL', async () => {
    const match = previewCsMatches[0];
    window.history.replaceState(null, '', `/krel?csMatch=${match.id}`);
    api.csMatch.mockResolvedValue({ ...match, playedAt: new Date(match.playedAt) });
    renderUi(<ProfileScreen profile={profile} signedIn={false} account={null} />);
    expect(screen.getByRole('tab', { name: 'Игры' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Leetify' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { name: 'Mirage' })).toBeVisible();
    expect(api.csMatch).toHaveBeenCalledWith(
        { id: profile.id, matchId: match.id },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
});

it('saves a review draft together with score and emoji without refreshing the route', async () => {
    api.view.mockResolvedValue(undefined);
    api.list.mockResolvedValue({ items: [], total: 0, page: 0, size: 12 });
    api.rate.mockImplementation(async ({ ratingInput }) => ({ ...rating, ...ratingInput, commentStatus: 'PENDING' }));
    let finishProfile: (value: PersonProfile) => void = vi.fn();
    api.profile.mockReturnValue(
        new Promise<PersonProfile>((resolve) => {
            finishProfile = resolve;
        }),
    );
    renderUi(<ProfileScreen profile={profile} signedIn account={null} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Оценки' }));
    expect(screen.getByRole('article', { name: 'Ваш отзыв' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Редактировать' }));
    const input = screen.getByLabelText('Комментарий к оценке · необязательно');
    fireEvent.change(input, { target: { value: 'Отличная компания' } });
    fireEvent.click(screen.getByRole('button', { name: 'Эмодзи оценки' }));
    fireEvent.click(await screen.findByRole('option', { name: '🐰' }));
    fireEvent.click(screen.getByRole('button', { name: 'Поставить 4 из 5' }));
    expect(api.rate).not.toHaveBeenCalled();
    expect(api.profile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(api.profile).toHaveBeenCalledOnce());
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Ваш отзыв' })).toHaveTextContent('Отличная компания');
    expect(screen.getByText('3.0 / 5')).toBeVisible();
    await act(async () => finishProfile({ ...profile, version: 2, stats: { ...profile.stats, ratingAverage: 4 } }));
    expect(await screen.findByText('4.0 / 5')).toBeVisible();
    expect(api.routeRefresh).not.toHaveBeenCalled();
    expect(api.view).toHaveBeenCalledOnce();
});

it('replaces the current page URL after an approved rename and avoids fetching the obsolete tag', () => {
    api.view.mockResolvedValue(undefined);
    renderUi(<ProfileScreen profile={profile} administrator signedIn account={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Редактирование страницы' }));
    expect(api.replace).toHaveBeenCalledWith('/new-tag');
    expect(api.profile).not.toHaveBeenCalled();
    expect(api.routeRefresh).not.toHaveBeenCalled();
});

it.each([false, true])('hides ownership actions from guests, including pending claims (%s)', (claimPending) => {
    renderUi(<ProfileScreen profile={{ ...profile, canClaim: true, claimPending }} signedIn={false} account={null} />);
    expect(screen.queryByRole('button', { name: 'Это моя страница' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Это моя страница' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Подтверждение на рассмотрении' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Подтверждение на рассмотрении' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('opens ownership verification from the avatar column for an eligible signed-in user', () => {
    const claimable = { ...profile, canClaim: true };
    const { rerender } = renderUi(<ProfileScreen profile={claimable} signedIn account={null} />);
    const button = screen.getByRole('button', { name: 'Это моя страница' });
    const heading = screen.getByRole('heading', { name: 'Крел' });
    expect(button.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(button);
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Как подтвердить, что это вы' })).toBeVisible();
    rerender(<ProfileScreen profile={claimable} signedIn={false} account={null} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Это моя страница' })).not.toBeInTheDocument();
});

it('keeps a pending ownership claim disabled for a signed-in user', () => {
    renderUi(<ProfileScreen profile={{ ...profile, canClaim: true, claimPending: true }} signedIn account={null} />);
    const button = screen.getByRole('button', { name: 'Подтверждение на рассмотрении' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('hides ownership actions from signed-in users without claim eligibility', () => {
    renderUi(<ProfileScreen profile={{ ...profile, canClaim: false }} signedIn account={null} />);
    expect(screen.queryByRole('button', { name: 'Это моя страница' })).not.toBeInTheDocument();
});
