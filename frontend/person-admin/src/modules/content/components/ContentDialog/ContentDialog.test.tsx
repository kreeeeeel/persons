import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { ContentDialog } from '@/modules/content/components/ContentDialog/ContentDialog';
const hide = vi.hoisted(() => vi.fn());
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { contentAdmin: { hideAdminContent: hide } },
    personError: async () => 'UNAVAILABLE',
}));
const item = {
    id: 'comment',
    kind: 'COMMENT' as const,
    status: 'PUBLISHED' as const,
    personId: 'page',
    personTag: 'demo',
    personName: 'Тест Иванов',
    text: 'История',
    authorName: 'Автор',
    createdAt: new Date(),
    previewAvailable: false,
    mediaAvailable: false,
};
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());
it('shows the destination and preserves the reason after a failed removal so the moderator can retry', async () => {
    hide.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    const saved = vi.fn();
    renderUi(<ContentDialog item={item} publicUrl="http://localhost:3002" onClose={vi.fn()} onSaved={saved} />);
    expect(screen.getByRole('link', { name: 'Тест Иванов · @demo' })).toHaveAttribute(
        'href',
        'http://localhost:3002/ru/person/demo',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Удалить публикацию' }));
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(hide).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Причина удаления' }), { target: { value: 'Нарушение' } });
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    await waitFor(() => expect(hide).toHaveBeenCalledOnce());
    expect(saved).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('Нарушение');
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(hide).toHaveBeenLastCalledWith({
        kind: 'COMMENT',
        id: 'comment',
        contentHideInput: { reason: 'Нарушение' },
    });
});
