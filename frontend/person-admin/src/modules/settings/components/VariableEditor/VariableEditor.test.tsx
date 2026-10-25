import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { VariableEditor } from '@/modules/settings/components/VariableEditor/VariableEditor';

const api = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock('@/shared/dynamicProperties/client', () => ({ dynamicPropertyClient: { updateVariable: api.update } }));
const property = {
    key: 'games.dotabuff.importFrom',
    type: 'INSTANT' as const,
    value: '"2026-10-22T00:00:00Z"',
    defaultValue: '"2026-10-22T00:00:00Z"',
    revision: 4,
    publicValue: false,
    description: 'Дата начала импорта матчей',
};
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

it('edits an instant with a calendar and keeps Moscow time while sending a UTC value', async () => {
    const user = userEvent.setup();
    api.update.mockResolvedValue({ ...property, revision: 5 });
    renderUi(<VariableEditor property={property} onClose={vi.fn()} onSaved={vi.fn()} />);
    const calendar = await screen.findByRole('button', { name: /Календарь|Calendar/ });
    expect(screen.getByText('Московское время · UTC+3')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
    fireEvent.click(calendar);
    const grid = await screen.findByRole('grid');
    const nextDay = within(grid).getByRole('button', { name: /23/ });
    fireEvent.click(nextDay);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Сохранить' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith({
            key: property.key,
            dynamicPropertyUpdate: { value: '"2026-10-23T00:00:00.000Z"', revision: 4 },
        }),
    );
});
