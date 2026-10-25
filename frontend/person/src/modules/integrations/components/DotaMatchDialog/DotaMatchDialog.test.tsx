import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { DotaMatchDialog } from '@/modules/integrations/components/DotaMatchDialog/DotaMatchDialog';
import { previewMatches } from '@/modules/integrations/model/previewMatches';

afterEach(cleanup);

it.each([
    ['ru', 'light', 'Поделиться'],
    ['en', 'dark', 'Share'],
] as const)('shows match details without a copy button in %s/%s', (locale, theme, shareLabel) => {
    const match = previewMatches[0];
    renderUi(<DotaMatchDialog match={match} personTag="krel" onClose={vi.fn()} />, locale, theme);
    const dialog = within(screen.getByRole('dialog'));

    expect(dialog.getByRole('heading', { name: match.hero })).toBeVisible();
    expect(dialog.getByText(match.duration, { exact: true })).toBeVisible();
    expect(dialog.getByRole('link', { name: /OpenDota/ })).toHaveAttribute('href', match.matchUrl);
    expect(dialog.queryByRole('button', { name: shareLabel })).not.toBeInTheDocument();
    expect(dialog.getAllByRole('button')).toHaveLength(1);
});

it('closes match details with Escape', async () => {
    const onClose = vi.fn();
    renderUi(<DotaMatchDialog match={previewMatches[0]} personTag="krel" onClose={onClose} />);

    await userEvent.setup().keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
});
