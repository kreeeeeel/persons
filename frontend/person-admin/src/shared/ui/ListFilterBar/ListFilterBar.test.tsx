import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { renderUi } from '@test/render';
import { ListFilterBar } from '@/shared/ui/ListFilterBar/ListFilterBar';

vi.mock('@/shared/ui/FilterIdentityPicker/FilterIdentityPicker', () => ({ FilterIdentityPicker: () => null }));
afterEach(cleanup);

it('searches automatically without submit controls', async () => {
    const onSearch = vi.fn();
    renderUi(<ListFilterBar search="" onSearch={onSearch} placeholder="Поиск материала" />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Поиск материала' }), { target: { value: 'прогулка' } });
    await waitFor(() => expect(onSearch).toHaveBeenCalledWith('прогулка'), { timeout: 3000 });
    expect(screen.queryByRole('button', { name: 'Применить' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Сбросить' })).not.toBeInTheDocument();
});

function Filters() {
    const [value, setValue] = useState('');
    return (
        <ListFilterBar
            search=""
            onSearch={() => undefined}
            placeholder="Поиск"
            fields={[
                {
                    key: 'type',
                    label: 'Тип материала',
                    value,
                    options: [{ value: 'PHOTO', content: 'Фото' }],
                    onChange: setValue,
                },
            ]}
        />
    );
}

it('adds a chosen filter chip and removes it individually', async () => {
    renderUi(<Filters />);
    fireEvent.click(screen.getByRole('button', { name: 'Добавить фильтр' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Тип материала' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Тип материала' }));
    fireEvent.click(await screen.findByText('Фото'));
    expect(await screen.findByRole('button', { name: 'Тип материала: Фото' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Убрать фильтр «Тип материала»' }));
    expect(screen.queryByRole('button', { name: 'Тип материала: Фото' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Добавить фильтр' })).toBeEnabled();
});

it('opens a calendar for date filters instead of a manual date textbox', async () => {
    renderUi(
        <ListFilterBar
            search=""
            onSearch={() => undefined}
            placeholder="Поиск"
            fields={[{ key: 'from', label: 'Дата с', type: 'date', value: '2026-10-21', onChange: vi.fn() }]}
        />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Дата с:/ }));
    expect(await screen.findByRole('grid')).toBeVisible();
    expect(screen.queryByDisplayValue('2026-10-21')).not.toBeInTheDocument();
});
