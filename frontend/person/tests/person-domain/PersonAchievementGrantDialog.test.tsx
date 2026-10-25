import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PersonAchievementGrantDialog } from '@persons/person-domain/PersonAchievementGrantDialog';
import { renderUi } from '@test/render';

const api = vi.hoisted(() => ({ list: vi.fn(), grant: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { achievements: { listAchievements: api.list, grantAchievement: api.grant } },
    personError: async () => 'UNAVAILABLE',
}));
const items = [
    { id: 'manual', title: 'Разработчик', active: true, type: 'MANUAL' },
    { id: 'retired', title: 'Старая награда', active: false, type: 'MANUAL' },
    { id: 'automatic', title: 'Один год', active: true, type: 'AUTOMATIC' },
];
beforeEach(() => {
    api.list.mockResolvedValue({ items, total: 3, page: 0, size: 20 });
    api.grant.mockResolvedValue({});
});
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

it('disables retired and automatic awards while preserving the complete scrollable list', async () => {
    const saved = vi.fn();
    renderUi(
        <PersonAchievementGrantDialog
            profile={{ id: 'person', fullName: 'Вадим' }}
            onClose={vi.fn()}
            onSaved={saved}
        />,
    );
    await waitFor(() => expect(api.list).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('combobox', { name: 'Достижения' }));
    const retired = await screen.findByRole('option', { name: /Старая награда/ });
    expect(retired).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('option', { name: /Один год/ })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(retired);
    expect(screen.getByRole('button', { name: 'Выдать достижение' })).toBeDisabled();
    fireEvent.click(screen.getByRole('option', { name: 'Разработчик' }));
    fireEvent.click(screen.getByRole('button', { name: 'Выдать достижение' }));
    await waitFor(() =>
        expect(api.grant).toHaveBeenCalledWith({
            id: 'manual',
            achievementGrantInput: { personIds: new Set(['person']), note: '' },
        }),
    );
    expect(saved).toHaveBeenCalledOnce();
});

it('filters illustrated options by their title rather than their UUID', async () => {
    renderUi(
        <PersonAchievementGrantDialog
            profile={{ id: 'person', fullName: 'Вадим' }}
            onClose={vi.fn()}
            onSaved={vi.fn()}
        />,
    );
    await waitFor(() => expect(api.list).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('combobox', { name: 'Достижения' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Фильтр' }), { target: { value: 'Разработчик' } });
    expect(await screen.findByRole('option', { name: 'Разработчик' })).toBeVisible();
    expect(screen.queryByRole('option', { name: /Старая награда/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Один год/ })).not.toBeInTheDocument();
});
