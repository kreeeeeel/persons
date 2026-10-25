import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { PublicationTable } from '@/shared/ui/PublicationTable/PublicationTable';
import type { PublicationRow } from '@/shared/ui/PublicationTable/PublicationTable.types';

afterEach(cleanup);
const row: PublicationRow = {
    id: 'video',
    title: 'Момент',
    text: 'Прогулка',
    page: { name: 'Страница', tag: 'page' },
    author: { name: 'Автор', tag: 'author' },
    status: 'Опубликовано',
    statusTheme: 'success',
    createdAt: new Date('2026-10-21T12:00:00Z'),
    sizeBytes: 1048576,
    selectable: true,
};

it('shows distinct page author upload time and file size columns and opens from the row', () => {
    const open = vi.fn();
    renderUi(<PublicationTable rows={[row]} onOpen={open} />);
    ['Материал', 'Страница', 'Автор', 'Статус', 'Время загрузки', 'Вес'].forEach((name) =>
        expect(screen.getByRole('columnheader', { name })).toBeVisible(),
    );
    expect(screen.getByText('1 МБ')).toBeVisible();
    expect(screen.queryByRole('columnheader', { name: 'Действия' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Опубликовано'));
    expect(open).toHaveBeenCalledExactlyOnceWith('video');
});

it('selects a row without opening its review', () => {
    const open = vi.fn();
    const select = vi.fn();
    renderUi(<PublicationTable rows={[row]} onOpen={open} selected={[]} onSelection={select} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Открыть: Прогулка' }));
    expect(select).toHaveBeenCalledExactlyOnceWith(['video']);
    expect(open).not.toHaveBeenCalled();
});
