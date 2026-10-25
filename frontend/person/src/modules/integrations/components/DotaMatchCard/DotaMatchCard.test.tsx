import { cleanup, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { DotaMatchCard } from '@/modules/integrations/components/DotaMatchCard/DotaMatchCard';
import { previewMatches } from '@/modules/integrations/model/previewMatches';

afterEach(cleanup);

it.each([
    ['ru', 'light', 'Победа', 'Счёт карты'],
    ['en', 'dark', 'Victory', 'Map score'],
] as const)('shows the team score beside the result in %s/%s', (locale, theme, outcome, label) => {
    renderUi(
        <DotaMatchCard match={{ ...previewMatches[0], score: 0, opponentScore: 42 }} onOpen={vi.fn()} />,
        locale,
        theme,
    );
    expect(screen.getByLabelText(label)).toHaveTextContent('0:42');
    expect(screen.getByLabelText(label).parentElement).toHaveTextContent(`${outcome} · 0:42`);
});

it('does not invent a score when a source does not provide both teams', () => {
    renderUi(<DotaMatchCard match={{ ...previewMatches[0], opponentScore: undefined }} onOpen={vi.fn()} />);
    expect(screen.getByText('Победа')).toBeVisible();
    expect(screen.queryByLabelText('Счёт карты')).not.toBeInTheDocument();
    expect(screen.queryByText('·')).not.toBeInTheDocument();
});
