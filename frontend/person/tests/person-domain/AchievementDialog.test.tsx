import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { AchievementDialog } from '@persons/person-domain/AchievementDialog';
import { AchievementType } from '@persons/person-client';
import { renderUi } from '@test/render';

afterEach(cleanup);
const item = {
    note: '',
    id: 'award',
    assignedAt: new Date('2026-10-17T12:00:00Z'),
    achievement: {
        id: 'developer',
        title: 'Разработчик',
        description: 'Создаёт работающие вещи.',
        active: true,
        version: 0,
        type: AchievementType.Manual,
        createdAt: new Date('2026-10-01T12:00:00Z'),
    },
};

it('opens an achievement with its image, description and localized award date', () => {
    renderUi(<AchievementDialog item={item} pending={false} onClose={vi.fn()} onRevoke={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Разработчик' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Разработчик' })).toHaveAttribute(
        'src',
        '/api/person/v1/achievements/developer/image',
    );
    expect(screen.getByText('Создаёт работающие вещи.')).toBeVisible();
    expect(screen.getByTitle(/17 октября 2026.*15:00/)).toHaveAttribute('datetime', item.assignedAt.toISOString());
    expect(screen.queryByRole('button', { name: 'Отозвать достижение' })).not.toBeInTheDocument();
});

it('explains automatic awards and does not offer a manual revoke', () => {
    const automatic = {
        ...item,
        achievement: { ...item.achievement, type: AchievementType.Automatic, pageAgeYears: 3 },
    };
    renderUi(<AchievementDialog item={automatic} canManage pending={false} onClose={vi.fn()} onRevoke={vi.fn()} />);
    expect(screen.getByText('Выдано автоматически за возраст страницы: 3 года.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Отозвать достижение' })).not.toBeInTheDocument();
});

it('keeps a manually awarded achievement when its revoke confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const onRevoke = vi.fn();
    renderUi(<AchievementDialog item={item} canManage pending={false} onClose={vi.fn()} onRevoke={onRevoke} />);
    const detail = screen.getByRole('dialog', { name: 'Разработчик' });
    await waitFor(() => expect(detail).toHaveFocus());
    await user.click(within(detail).getByRole('button', { name: 'Отозвать достижение' }));
    const confirmation = await screen.findByRole('dialog', { name: 'Отозвать достижение?' });
    await waitFor(() => expect(confirmation).toHaveFocus());
    expect(onRevoke).not.toHaveBeenCalled();
    await user.click(within(confirmation).getByRole('button', { name: 'Отмена' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Отозвать достижение?' })).not.toBeInTheDocument());
    expect(screen.getByRole('dialog', { name: 'Разработчик' })).toBeVisible();
    expect(onRevoke).not.toHaveBeenCalled();
});

it('revokes a manually awarded achievement once after the administrator confirms', async () => {
    const user = userEvent.setup();
    const onRevoke = vi.fn();
    renderUi(<AchievementDialog item={item} canManage pending={false} onClose={vi.fn()} onRevoke={onRevoke} />);
    const detail = screen.getByRole('dialog', { name: 'Разработчик' });
    await waitFor(() => expect(detail).toHaveFocus());
    await user.click(within(detail).getByRole('button', { name: 'Отозвать достижение' }));
    const confirmation = await screen.findByRole('dialog', { name: 'Отозвать достижение?' });
    await waitFor(() => expect(confirmation).toHaveFocus());
    expect(onRevoke).not.toHaveBeenCalled();
    await user.click(within(confirmation).getByRole('button', { name: 'Отозвать достижение' }));
    expect(onRevoke).toHaveBeenCalledOnce();
});
