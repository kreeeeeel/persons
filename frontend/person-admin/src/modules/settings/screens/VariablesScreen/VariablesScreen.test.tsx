import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { VariablesScreen } from '@/modules/settings/screens/VariablesScreen/VariablesScreen';
import { ResponseError } from '@persons/dynamic-properties-client';

const api = vi.hoisted(() => ({ list: vi.fn(), update: vi.fn() }));
vi.mock('@/shared/dynamicProperties/client', () => ({
    dynamicPropertyClient: { listVariables: api.list, updateVariable: api.update },
}));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { variables: { listVariables: api.list, updateVariable: api.update } },
    personError: () => 'CONFLICT',
}));
vi.mock('next/navigation', () => ({ usePathname: () => null }));
beforeEach(() => {
    api.list.mockResolvedValue([
        { key: 'site.marqueeEnabled', type: 'BOOLEAN', value: 'true', revision: 4 },
        { key: 'legal.supportEmail', type: 'STRING', value: '""', revision: 0 },
    ]);
    api.update.mockResolvedValue({ key: 'site.marqueeEnabled', type: 'BOOLEAN', value: 'false', revision: 5 });
});
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

it('edits by clicking a row without an action column and uses the loaded revision', async () => {
    renderUi(<VariablesScreen />);
    fireEvent.click(await screen.findByRole('cell', { name: 'BOOLEAN' }));
    expect(screen.queryByRole('columnheader', { name: 'Действия' })).not.toBeInTheDocument();
    expect(screen.queryByText('Изменить', { exact: true })).not.toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Значение' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith({
            key: 'site.marqueeEnabled',
            dynamicPropertyUpdate: { value: 'false', revision: 4 },
        }),
    );
    expect(await screen.findByText('Переменная сохранена')).toBeInTheDocument();
    expect(api.list).toHaveBeenCalledTimes(2);
});

it('keeps the editor and draft after a conflicting update', async () => {
    api.update.mockRejectedValue(new ResponseError(new Response('{"code":"CONFLICT"}', { status: 409 })));
    renderUi(<VariablesScreen />, 'en', 'dark');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit: Show scrolling ticker' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('switch'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledOnce());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByRole('switch')).not.toBeChecked();
});

it('illustrates an empty settings search in English without losing the filter', async () => {
    renderUi(<VariablesScreen />, 'en', 'dark');
    await screen.findByRole('cell', { name: 'BOOLEAN' });
    const search = screen.getByRole('textbox');
    fireEvent.change(search, { target: { value: 'missing-variable' } });
    expect(await screen.findByText('No variables found')).toBeVisible();
    expect(screen.getByAltText('Evgeny looks for settings in an empty toolbox')).toHaveAttribute(
        'src',
        '/media/empty-settings-evgeny-v1.webp',
    );
    expect(search).toHaveValue('missing-variable');
    fireEvent.change(search, { target: { value: '' } });
    expect(await screen.findByRole('cell', { name: 'BOOLEAN' })).toBeVisible();
});
