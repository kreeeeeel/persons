import { cleanup, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { previewMatches } from '@/modules/integrations/model/previewMatches';

const api = vi.hoisted(() => ({ matches: vi.fn(), match: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personError: async () => 'UNAVAILABLE',
    personClient: { games: { listDotaMatches: api.matches, getDotaMatch: api.match } },
}));
beforeEach(() =>
    api.matches.mockResolvedValue({
        items: previewMatches.map((match) => ({
            ...match,
            won: match.result === 'victory',
            playedAt: new Date(match.playedAt),
            durationSeconds: Number(match.duration.split(':')[0]) * 60 + Number(match.duration.split(':')[1]),
        })),
        total: 4,
        page: 0,
        size: 12,
    }),
);
import { IntegrationsPanel } from '@/modules/integrations/components/IntegrationsPanel/IntegrationsPanel';
import { renderUi } from '@test/render';

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

it('loads match history through the integration adapter with the shared service tabs', async () => {
    renderUi(<IntegrationsPanel personId="profile" />);
    expect(screen.getByRole('tab', { name: 'OpenDota' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { name: '22 октября' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '21 октября' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: /^Открыть матч:/ })).toHaveLength(4);
    expect(screen.getAllByText('Победа')).toHaveLength(2);
    expect(screen.getAllByText('Поражение')).toHaveLength(2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it.each([
    ['ru', 'light', 'Подробности матча', 'Легенда IV', 'Убийства'],
    ['en', 'dark', 'Match details', 'Legend IV', 'Kills'],
] as const)('opens the selected match and closes with Escape in %s / %s', async (locale, theme, title, rank, kills) => {
    const user = userEvent.setup();
    renderUi(<IntegrationsPanel personId="profile" />, locale, theme);
    const card = await screen.findByRole('button', { name: /Juggernaut/ });
    expect(within(card).getByText(rank)).toBeVisible();
    expect(card.querySelector('img[src$="/ranks/rank-5.png"]')).toBeVisible();
    expect(card.querySelector('img[src$="/ranks/stars-4.png"]')).toBeVisible();
    await user.click(card);
    const dialog = screen.getByRole('dialog', { name: title });
    expect(within(dialog).getByRole('heading', { name: 'Juggernaut' })).toBeVisible();
    expect(within(dialog).getByRole('img', { name: 'Juggernaut' })).toHaveAttribute(
        'src',
        '/assets/integrations/dotabuff/juggernaut-icon.png',
    );
    expect(within(dialog).getByText('42:18')).toBeVisible();
    expect(within(dialog).getByText(rank)).toBeVisible();
    expect(within(dialog).getByText('HD')).toHaveAttribute('title', locale === 'ru' ? 'Урон героям' : 'Hero damage');
    expect(within(dialog).getByText('TD')).toHaveAttribute(
        'title',
        locale === 'ru' ? 'Урон постройкам' : 'Building damage',
    );
    expect(within(dialog).getByText('HD').previousElementSibling).toHaveTextContent('34');
    expect(within(dialog).queryByText(locale === 'ru' ? 'Нейтралка' : 'Neutral')).not.toBeInTheDocument();
    expect(within(dialog).getByText(kills)).toBeVisible();
    expect(within(dialog).getByText('18')).toBeVisible();
    expect(within(dialog).getByText('4')).toBeVisible();
    expect(within(dialog).getByText('12')).toBeVisible();
    expect(within(dialog).getAllByRole('img')).toHaveLength(8);
    expect(within(dialog).getByRole('img', { name: 'Battle Fury' })).toBeVisible();
    expect(within(dialog).getByRole('img', { name: 'Telescope' })).toBeVisible();
    expect(within(dialog).getByRole('img', { name: 'Telescope' })).toHaveStyle({ objectFit: 'contain' });
    expect(within(dialog).getByText(locale === 'ru' ? '15 м' : '15 m')).toBeVisible();
    expect(within(dialog).getByText(new Intl.NumberFormat(locale).format(34825).replace(/\s/g, ' '))).toBeVisible();
    expect(within(dialog).getByText(new Intl.NumberFormat(locale).format(8321).replace(/\s/g, ' '))).toBeVisible();
    expect(within(dialog).queryByText('OpenDota', { exact: true })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('link')).toHaveAttribute('href', previewMatches[0].matchUrl);
    expect(within(dialog).getByRole('link')).toHaveAttribute('target', '_blank');
    expect(within(dialog).getByRole('link')).toHaveAccessibleName(/OpenDota/);
    expect(dialog.querySelector('time')).toHaveAttribute(
        'datetime',
        new Date(previewMatches[0].playedAt).toISOString(),
    );
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(card).toHaveFocus();
});

it('opens a different match with its own result, hero and items using the keyboard', async () => {
    const user = userEvent.setup();
    renderUi(<IntegrationsPanel personId="profile" />);
    const card = await screen.findByRole('button', { name: /Pudge/ });
    card.focus();
    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Pudge' })).toBeVisible();
    expect(within(dialog).getByText('Поражение')).toBeVisible();
    expect(within(dialog).getByText('36:54')).toBeVisible();
    expect(within(dialog).getByRole('img', { name: 'Blink Dagger' })).toBeVisible();
    expect(within(dialog).queryByRole('img', { name: 'Battle Fury' })).not.toBeInTheDocument();
    expect(within(dialog).getAllByText('—')).toHaveLength(2);
    expect(within(dialog).getByLabelText('Пустой слот')).toBeVisible();
    expect(within(dialog).queryByText(/\d+ м$/)).not.toBeInTheDocument();
});

it('uses the integration illustration for an empty history', async () => {
    api.matches.mockResolvedValue({ items: [], total: 0, page: 0, size: 12 });
    renderUi(<IntegrationsPanel personId="empty" />);
    expect(await screen.findByRole('heading', { name: 'Пока без каток' })).toBeVisible();
    expect(screen.getByRole('img', { name: /Lifestealer/ })).toHaveAttribute(
        'src',
        '/media/empty-dota-lifestealer-vadim-v3.webp',
    );
});

it('opens a shared Dota match through the item API without inserting it into the history', async () => {
    const user = userEvent.setup();
    const match = previewMatches[0];
    const matchId = '8000000001';
    window.history.replaceState(null, '', `/vadim?lang=ru&dotaMatch=${matchId}`);
    api.matches.mockResolvedValue({ items: [], total: 0, page: 0, size: 12 });
    api.match.mockResolvedValue({
        ...match,
        id: matchId,
        won: true,
        playedAt: new Date(match.playedAt),
        durationSeconds: 2538,
    });
    renderUi(<IntegrationsPanel personId="profile" personTag="vadim" />);
    expect(await screen.findByRole('heading', { name: 'Juggernaut' })).toBeVisible();
    const dialog = screen.getByRole('dialog', { name: 'Подробности матча' });
    await waitFor(() => expect(dialog).toHaveFocus());
    expect(api.match).toHaveBeenCalledWith(
        { id: 'profile', matchId },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.queryByRole('button', { name: /Открыть матч:.*Juggernaut/ })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Поделиться' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.location.search).toBe('?lang=ru');
});
