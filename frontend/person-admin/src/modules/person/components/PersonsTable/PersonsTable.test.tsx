import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { PersonsTable } from '@/modules/person/components/PersonsTable/PersonsTable';

afterEach(cleanup);
it('shows linked identity and unlinked label and keeps existing actions in a dropdown', async () => {
    const edit = vi.fn();
    renderUi(
        <PersonsTable
            items={[
                {
                    id: 'one',
                    tag: 'one',
                    fullName: 'Первая страница',
                    published: true,
                    pendingChanges: 0,
                    ownerAccountId: 'user',
                    ownerName: 'Кирилл',
                    ownerTag: 'krel',
                },
                { id: 'two', tag: 'two', fullName: 'Вторая страница', published: false, pendingChanges: 1 },
            ]}
            publicUrl="http://localhost:3002"
            pending={false}
            onManage={vi.fn()}
            onEdit={edit}
            onOwner={vi.fn()}
            onUpload={vi.fn()}
            onRemove={vi.fn()}
        />,
    );
    expect(screen.getByText('@krel')).toBeVisible();
    expect(screen.getByText('Не привязана')).toBeVisible();
    expect(screen.getByText('На модерации')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Редактировать' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Действия: Первая страница' }));
    fireEvent.click(await screen.findByText('Редактировать'));
    expect(edit).toHaveBeenCalledOnce();
});
