import { cleanup, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { IntegrationsPanel } from '@/modules/integrations/components/IntegrationsPanel/IntegrationsPanel';
import { CsMatchCard } from '@/modules/integrations/components/CsMatchCard/CsMatchCard';
import { CsMatchDialog } from '@/modules/integrations/components/CsMatchDialog/CsMatchDialog';
import { previewCsMatches } from '@/modules/integrations/model/previewCsMatches';

const api = vi.hoisted(() => ({ cs: vi.fn(), dota: vi.fn(), match: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { games: { listCsMatches: api.cs, listDotaMatches: api.dota, getCsMatch: api.match } },
    personError: async () => 'UNAVAILABLE',
}));

beforeEach(() => {
    api.dota.mockResolvedValue({ items: [], page: 0, size: 12, total: 0 });
    api.cs.mockResolvedValue({
        items: previewCsMatches.slice(0, 3).map((match) => ({ ...match, playedAt: new Date(match.playedAt) })),
        page: 0,
        size: 12,
        total: 3,
    });
});
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
});

it.each([
    ['ru', 'light', 'Премьер · Mirage', 'Победа', 'Счёт карты'],
    ['en', 'dark', 'Premier · Mirage', 'Victory', 'Map score'],
] as const)(
    'loads Leetify cards and opens map details in %s / %s',
    async (locale, theme, title, outcome, scoreLabel) => {
        const user = userEvent.setup();
        renderUi(<IntegrationsPanel personId={`cs-${locale}`} />, locale, theme);
        const tab = screen.getByRole('tab', { name: 'Leetify' });
        expect(tab.querySelector('img')).toHaveAttribute('src', '/assets/integrations/leetify/leetify-logo.svg');
        await user.click(tab);
        expect(await screen.findByText(title)).toBeVisible();
        expect(screen.getAllByLabelText(scoreLabel)[0]).toHaveTextContent('13:9');
        expect(screen.getAllByLabelText(scoreLabel)[0].parentElement).toHaveTextContent(`${outcome} · 13:9`);
        expect(screen.getByText('2462 ELO')).toBeVisible();
        const card = screen.getByRole('button', { name: /Mirage/ });
        card.focus();
        await user.keyboard('{Enter}');
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByRole('heading', { name: 'Mirage' })).toBeVisible();
        expect(within(dialog).getByLabelText(scoreLabel).parentElement).toHaveTextContent(`${outcome} · 13:9`);
        expect(within(dialog).getByText('35:34')).toBeVisible();
        expect(within(dialog).getByText(locale === 'ru' ? '58,33%' : '58.33%')).toBeVisible();
        expect(within(dialog).getByText(locale === 'ru' ? '+4,20' : '+4.20')).toBeVisible();
        expect(
            within(dialog).getByRole('link', {
                name: locale === 'ru' ? 'Открыть матч на Leetify' : 'View match on Leetify',
            }),
        ).toHaveAttribute('target', '_blank');
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(card).toHaveFocus();
        expect(api.cs).toHaveBeenCalledWith(
            { id: `cs-${locale}`, page: 0, size: 12 },
            { signal: expect.any(AbortSignal) },
        );
    },
);

it.each([
    ['VICTORY', 'Победа'],
    ['DEFEAT', 'Поражение'],
    ['DRAW', 'Ничья'],
] as const)('places the %s score beside its outcome in separate text segments', (outcome, label) => {
    renderUi(<CsMatchCard match={{ ...previewCsMatches[0], outcome }} onOpen={vi.fn()} />);
    const score = screen.getByLabelText('Счёт карты');
    expect(score).toHaveTextContent('13:9');
    expect(score.parentElement).toHaveTextContent(`${label} · 13:9`);
    expect(within(score.parentElement!).getByText(label, { exact: true })).toBeVisible();
    expect(within(score.parentElement!).getByText('·', { exact: true })).toBeVisible();
});

it('shows a FACEIT level image and ELO value without its suffix inside the dialog', () => {
    renderUi(<CsMatchDialog match={previewCsMatches[1]} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('img', { name: 'Уровень FACEIT: 9' })).toHaveAttribute(
        'src',
        '/assets/integrations/leetify/ranks/faceit-9.png',
    );
    expect(within(dialog).getByText('2462')).toBeVisible();
    expect(within(dialog).queryByText(/ELO/)).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('Счёт карты').parentElement).toHaveTextContent('Поражение · 9:13');
});

it('renders a compact square FACEIT badge in the history card', () => {
    renderUi(<CsMatchCard match={previewCsMatches[1]} onOpen={vi.fn()} />);
    const badge = screen.getByRole('img', { name: 'Уровень FACEIT: 9' });
    expect(badge.parentElement).toHaveStyle({ width: '24px', height: '24px' });
    expect(badge).toHaveStyle({ objectFit: 'contain' });
});

it('keeps visited histories mounted without refetching them on every tab switch', async () => {
    const user = userEvent.setup();
    renderUi(<IntegrationsPanel personId="stable-tabs" />);
    await screen.findByText('Пока без каток');
    await user.click(screen.getByRole('tab', { name: 'Leetify' }));
    const card = await screen.findByRole('button', { name: /Mirage/ });
    await user.click(screen.getByRole('tab', { name: 'OpenDota' }));
    expect(screen.queryByRole('button', { name: /Mirage/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Leetify' }));
    expect(screen.getByRole('button', { name: /Mirage/ })).toBe(card);
    expect(api.cs).toHaveBeenCalledTimes(1);
    expect(api.dota).toHaveBeenCalledTimes(1);
});

it('keeps unavailable values separate from Leetify Rating', () => {
    renderUi(
        <CsMatchDialog
            match={{
                ...previewCsMatches[0],
                durationSeconds: undefined,
                rank: undefined,
                kd: undefined,
                adr: undefined,
                hsPercent: undefined,
                personalPerformance: undefined,
                leetifyRating: 0.1234,
            }}
            onClose={vi.fn()}
        />,
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByText('—')).toHaveLength(4);
    expect(within(dialog).getByText('Недостаточно данных')).toBeVisible();
    expect(within(dialog).queryByText('+12,34')).not.toBeInTheDocument();
});

it('uses the SAS empty state with its own description', async () => {
    const user = userEvent.setup();
    api.cs.mockResolvedValue({ items: [], page: 0, size: 12, total: 0 });
    renderUi(<IntegrationsPanel personId="cs-empty" />);
    await user.click(screen.getByRole('tab', { name: 'Leetify' }));
    expect(await screen.findByText('Вадим, видимо, больше не зовёт апать кейс.')).toBeVisible();
    expect(screen.getByRole('img', { name: /SAS/ })).toHaveAttribute('src', '/media/empty-cs-sas-vadim-v2.webp');
});

it('selects Leetify and opens a shared CS match even when it is absent from the loaded history', async () => {
    const user = userEvent.setup();
    const match = previewCsMatches[0];
    window.history.replaceState(null, '', `/vadim?lang=ru&csMatch=${match.id}`);
    api.cs.mockResolvedValue({ items: [], page: 0, size: 12, total: 0 });
    api.match.mockResolvedValue({ ...match, playedAt: new Date(match.playedAt) });
    renderUi(<IntegrationsPanel personId="profile" personTag="vadim" />);
    expect(screen.getByRole('tab', { name: 'Leetify' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { name: 'Mirage' })).toBeVisible();
    const dialog = screen.getByRole('dialog', { name: 'Подробности матча' });
    await waitFor(() => expect(dialog).toHaveFocus());
    expect(api.match).toHaveBeenCalledWith(
        { id: 'profile', matchId: match.id },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.queryByRole('button', { name: /Открыть матч:.*Mirage/ })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Поделиться' })).toBeEnabled();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.location.search).toBe('?lang=ru');
});
