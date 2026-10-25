import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { PageRestrictionsDialog } from '@/modules/users/components/PageRestrictionsDialog/PageRestrictionsDialog';
const api = vi.hoisted(() => ({ list: vi.fn(), set: vi.fn(), revoke: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: {
        pageRestrictions: {
            listPageRestrictions: api.list,
            setPageRestriction: api.set,
            revokePageRestriction: api.revoke,
        },
    },
    personError: async () => 'UNAVAILABLE',
}));
const item = {
    id: 'rule',
    userId: 'author',
    personId: 'page',
    personTag: 'demo',
    personName: 'Александр Иванов',
    scopes: new Set(['COMMENTS' as const]),
    reason: 'Причина ограничения',
    createdAt: new Date(),
    active: true,
};
afterEach(cleanup);
beforeEach(() => {
    vi.clearAllMocks();
    api.list.mockResolvedValue({ items: [item] });
});
it('edits the exact user-page restriction and keeps the form after a failed save', async () => {
    api.set.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(item);
    const saved = vi.fn();
    renderUi(
        <PageRestrictionsDialog
            userId="author"
            name="Автор"
            publicUrl="http://localhost:3002"
            onClose={vi.fn()}
            onSaved={saved}
        />,
    );
    expect(screen.queryByRole('button', { name: 'Закрыть' })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Изменить ограничение: Александр Иванов' }));
    const reason = screen.getByRole('textbox', { name: 'Причина ограничения' });
    fireEvent.change(reason, { target: { value: '  Уточнённая причина  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(api.set).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Сохранить' })).toBeEnabled(), { timeout: 3000 });
    expect(saved).not.toHaveBeenCalled();
    expect(reason).toHaveValue('  Уточнённая причина  ');
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(api.set).toHaveBeenLastCalledWith({
        id: 'author',
        pageRestrictionInput: {
            personId: 'page',
            scopes: new Set(['COMMENTS']),
            reason: 'Уточнённая причина',
            expiresAt: undefined,
        },
    });
});
it('revokes only the selected page restriction and refreshes the list', async () => {
    api.revoke.mockResolvedValue(undefined);
    api.list.mockResolvedValueOnce({ items: [item] }).mockResolvedValue({ items: [] });
    renderUi(
        <PageRestrictionsDialog
            userId="author"
            name="Автор"
            publicUrl="http://localhost:3002"
            onClose={vi.fn()}
            onSaved={vi.fn()}
        />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Снять.*Александр Иванов/ }));
    await waitFor(() => expect(api.revoke).toHaveBeenCalledWith({ id: 'author', restrictionId: 'rule' }));
    expect(await screen.findByText('Ограничений на отдельных страницах нет.')).toBeVisible();
    expect(screen.getByAltText('Юрий держит открытый замок рядом с пустым списком ограничений')).toHaveAttribute(
        'src',
        '/media/empty-restrictions-yuri-v1.webp',
    );
});
