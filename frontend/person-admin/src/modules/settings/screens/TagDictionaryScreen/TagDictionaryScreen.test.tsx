import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { TagDictionaryScreen } from '@/modules/settings/screens/TagDictionaryScreen/TagDictionaryScreen';

const api = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { tags: { listTagDefinitions: api.list, updateTagDefinitions: api.save } },
    personError: async () => 'INVALID_INPUT',
}));
beforeEach(() => {
    vi.clearAllMocks();
    api.list.mockResolvedValue([{ tag: 'dota', descriptions: { ru: 'Игра', en: 'Game' } }]);
});
afterEach(cleanup);

it('edits both translations and saves through the real contract shape', async () => {
    api.save.mockImplementation(async ({ tagDefinition }) => tagDefinition);
    renderUi(<TagDictionaryScreen />);
    fireEvent.change(await screen.findByRole('textbox', { name: 'Описание на русском' }), {
        target: { value: 'Игра с друзьями' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
        expect(api.save).toHaveBeenCalledWith({
            tagDefinition: [{ tag: 'dota', descriptions: { ru: 'Игра с друзьями', en: 'Game' } }],
        }),
    );
    expect(await screen.findByText('Справочник сохранён')).toBeVisible();
});

it('preserves edited definitions after a failed save and allows retry', async () => {
    api.save.mockRejectedValueOnce(new Error('offline')).mockImplementation(async ({ tagDefinition }) => tagDefinition);
    renderUi(<TagDictionaryScreen />);
    const field = await screen.findByRole('textbox', { name: 'Описание на русском' });
    fireEvent.change(field, { target: { value: 'Новая версия' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(field).toHaveValue('Новая версия');
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText('Справочник сохранён')).toBeVisible();
});
