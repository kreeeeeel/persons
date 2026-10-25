import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { ModerationBulkDialog } from '@/modules/moderation/components/ModerationBulkDialog/ModerationBulkDialog';
const decide = vi.hoisted(() => vi.fn());
vi.mock('@persons/person-domain/api/browser', () => ({ personClient: { admin: { decideModeration: decide } } }));
const base = {
    personId: 'page',
    personTag: 'test',
    kind: 'CREATE_COMMENT' as const,
    summary: 'Комментарий',
    payload: '{}',
    authorName: 'Автор',
    status: 'PENDING' as const,
    createdAt: new Date(),
};
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());
it('requires a rejection reason and reports successful and failed requests separately', async () => {
    decide.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('conflict'));
    const completed = vi.fn();
    renderUi(
        <ModerationBulkDialog
            items={[
                { ...base, id: 'one' },
                { ...base, id: 'two' },
            ]}
            decision="REJECT"
            onComplete={completed}
            onClose={vi.fn()}
        />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Отклонить выбранное' }));
    expect(decide).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Причина решения' }), { target: { value: '  Причина  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отклонить выбранное' }));
    await waitFor(() => expect(completed).toHaveBeenCalledWith({ success: ['one'], failed: ['two'] }));
    expect(decide).toHaveBeenNthCalledWith(1, { id: 'one', decisionInput: { decision: 'REJECT', reason: 'Причина' } });
});
