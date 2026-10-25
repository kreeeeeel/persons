import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AchievementType, type Achievement } from '@persons/person-client';
import { renderUi } from '@test/render';
import { AchievementEditor } from '@/modules/achievements/components/AchievementEditor/AchievementEditor';

const api = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), image: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: {
        achievements: {
            createAchievement: api.create,
            updateAchievement: api.update,
            updateAchievementImage: api.image,
        },
    },
    personError: async () => 'UNAVAILABLE',
}));
const achievement: Achievement = {
    id: 'anniversary',
    title: 'Третий год',
    description: 'Среди своих',
    active: true,
    version: 2,
    type: AchievementType.Automatic,
    pageAgeYears: 3,
    createdAt: new Date('2026-10-19T12:00:00Z'),
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:achievement-preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    api.create.mockResolvedValue(achievement);
    api.update.mockResolvedValue(achievement);
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

it('preserves an automatic rule when editing an existing achievement', async () => {
    const saved = vi.fn();
    renderUi(<AchievementEditor achievement={achievement} onClose={vi.fn()} onSaved={saved} />);
    expect(screen.getByRole('combobox', { name: 'Способ выдачи' })).toHaveTextContent('Автоматически');
    expect(screen.getByRole('combobox', { name: 'Возраст страницы' })).toHaveTextContent('3 года');
    fireEvent.change(screen.getByRole('textbox', { name: 'Название достижения' }), { target: { value: 'Три года' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(api.update).toHaveBeenCalledWith({
        id: achievement.id,
        achievementInput: {
            title: 'Три года',
            description: achievement.description,
            active: true,
            version: 2,
            type: AchievementType.Automatic,
            pageAgeYears: 3,
        },
    });
});

it('clears the age condition when switching to manual awards', async () => {
    renderUi(<AchievementEditor achievement={achievement} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Способ выдачи' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Вручную' }));
    expect(screen.queryByRole('combobox', { name: 'Возраст страницы' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledOnce());
    expect(api.update.mock.calls[0][0].achievementInput).toMatchObject({
        type: AchievementType.Manual,
        pageAgeYears: undefined,
    });
});

it('creates an automatic achievement with one of five available anniversaries', async () => {
    renderUi(<AchievementEditor onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByRole('textbox', { name: 'Название достижения' })).not.toBeInTheDocument();
    const file = new File(['badge'], 'badge.png', { type: 'image/png' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Название достижения' }), { target: { value: 'Пятый год' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Доступно к выдаче' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Способ выдачи' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Автоматически' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Возраст страницы' }));
    expect(within(screen.getAllByRole('listbox').at(-1)!).getAllByRole('option')).toHaveLength(5);
    fireEvent.click(screen.getByRole('option', { name: '5 лет' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledOnce());
    expect(api.create).toHaveBeenCalledWith({
        title: 'Пятый год',
        description: '',
        file,
        type: AchievementType.Automatic,
        active: false,
        pageAgeYears: 5,
    });
});

it('shows an API failure and keeps the editor open for retry', async () => {
    api.update.mockRejectedValueOnce(new Error('offline'));
    const saved = vi.fn();
    renderUi(<AchievementEditor achievement={achievement} onClose={vi.fn()} onSaved={saved} />);
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText('Не удалось связаться с сервисом. Попробуйте ещё раз.')).toBeVisible();
    expect(saved).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeVisible();
});

it('keeps the upload step open when the selected file is invalid', () => {
    renderUi(<AchievementEditor onClose={vi.fn()} onSaved={vi.fn()} />);
    const file = new File(['video'], 'badge.mov', { type: 'video/quicktime' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    expect(screen.getByRole('dialog', { name: 'Изображение достижения' })).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'Название достижения' })).not.toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
});
