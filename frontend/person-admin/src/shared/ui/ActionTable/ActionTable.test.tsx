import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Button } from '@gravity-ui/uikit';
import { renderUi } from '@test/render';
import { ActionTable } from '@/shared/ui/ActionTable/ActionTable';

afterEach(cleanup);

it('opens the exact row menu by clicking any cell without adding an action column', async () => {
    const edit = vi.fn();
    renderUi(
        <ActionTable
            data={[
                { id: 'one', title: 'Первая', status: 'Опубликована' },
                { id: 'two', title: 'Вторая', status: 'Скрыта' },
            ]}
            label={(item) => item.title}
            columns={[
                { id: 'title', name: 'Название', template: (item) => item.title },
                { id: 'status', name: 'Статус' },
            ]}
            actions={(item) => [{ text: 'Редактировать', action: () => edit(item.id) }]}
        />,
    );
    expect(screen.queryByRole('columnheader', { name: 'Действия' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('cell', { name: 'Скрыта' }));
    fireEvent.click(await screen.findByText('Редактировать'));
    expect(edit).toHaveBeenCalledExactlyOnceWith('two');
});

it('provides a named keyboard-accessible trigger in the first cell', async () => {
    renderUi(
        <ActionTable
            data={[{ id: 'one', title: 'Первая' }]}
            label={(item) => item.title}
            columns={[{ id: 'title', template: (item) => item.title }]}
            actions={() => [{ text: 'Открыть', action: vi.fn() }]}
        />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Действия: Первая' }));
    expect(await screen.findByText('Открыть')).toBeVisible();
});

it('opens a row directly and leaves nested controls independent', () => {
    const open = vi.fn();
    const view = vi.fn();
    const viewLabel = 'Посмотреть';
    renderUi(
        <ActionTable
            data={[{ id: 'one', title: 'Переменная', type: 'JSON' }]}
            label={(item) => item.title}
            actionLabel="Изменить"
            onOpen={open}
            columns={[
                { id: 'title', template: (item) => item.title },
                { id: 'type' },
                { id: 'value', template: () => <Button onClick={view}>{viewLabel}</Button> },
            ]}
        />,
    );
    fireEvent.click(screen.getByRole('cell', { name: 'JSON' }));
    expect(open).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: 'one' }));
    fireEvent.click(screen.getByRole('button', { name: 'Посмотреть' }));
    expect(view).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Изменить: Переменная' }));
    expect(open).toHaveBeenCalledTimes(2);
});
