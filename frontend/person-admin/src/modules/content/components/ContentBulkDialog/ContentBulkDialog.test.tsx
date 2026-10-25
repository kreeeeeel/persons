import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AdminContentItem } from '@persons/person-client';
import { renderUi } from '@test/render';
import { ContentBulkDialog } from '@/modules/content/components/ContentBulkDialog/ContentBulkDialog';

const api = vi.hoisted(() => ({ hide: vi.fn(), decide: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { contentAdmin: { hideAdminContent: api.hide }, admin: { decideModeration: api.decide } },
    personError: async () => 'CONFLICT',
}));
const base: AdminContentItem = {
    id: 'one',
    kind: 'COMMENT',
    status: 'PUBLISHED',
    personId: 'page',
    personName: 'Кирилл',
    personTag: 'krel',
    authorName: 'Автор',
    text: 'Материал',
    createdAt: new Date(),
    mediaAvailable: false,
    previewAvailable: false,
};
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

it('requires a removal reason, processes child material before a page and reports failed rows for retry', async () => {
    const complete = vi.fn();
    api.hide.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('conflict'));
    renderUi(
        <ContentBulkDialog
            action="REMOVE"
            items={[
                { ...base, kind: 'PERSON' },
                { ...base, id: 'two' },
            ]}
            onComplete={complete}
            onClose={vi.fn()}
        />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(api.hide).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Причина удаления' }), { target: { value: '  Нарушение  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    await waitFor(() =>
        expect(complete).toHaveBeenCalledWith({
            success: ['COMMENT:two'],
            failures: [{ key: 'PERSON:one', code: 'CONFLICT' }],
        }),
    );
    expect(api.hide).toHaveBeenNthCalledWith(1, {
        kind: 'COMMENT',
        id: 'two',
        contentHideInput: { reason: 'Нарушение' },
    });
    expect(api.decide).not.toHaveBeenCalled();
});

it('reviews only pending changes, using request identifiers rather than material identifiers', async () => {
    const complete = vi.fn();
    api.decide.mockResolvedValue({});
    renderUi(
        <ContentBulkDialog
            action="APPROVE"
            items={[
                base,
                { ...base, id: 'two', pendingRequestId: 'request' },
                { ...base, id: 'hidden', status: 'HIDDEN' },
            ]}
            onComplete={complete}
            onClose={vi.fn()}
        />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Согласовать' }));
    await waitFor(() => expect(complete).toHaveBeenCalledWith({ success: ['COMMENT:two'], failures: [] }));
    expect(api.decide).toHaveBeenCalledExactlyOnceWith({
        id: 'request',
        decisionInput: { decision: 'APPROVE', reason: undefined },
    });
    expect(api.hide).not.toHaveBeenCalled();
});

it('requires a rejection reason before changing any pending publication', async () => {
    api.decide.mockResolvedValue({});
    renderUi(
        <ContentBulkDialog
            action="REJECT"
            items={[{ ...base, pendingRequestId: 'request' }]}
            onComplete={vi.fn()}
            onClose={vi.fn()}
        />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Отклонить' }));
    expect(api.decide).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Причина решения' }), {
        target: { value: 'Недостаточно контекста' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Отклонить' }));
    await waitFor(() =>
        expect(api.decide).toHaveBeenCalledWith({
            id: 'request',
            decisionInput: { decision: 'REJECT', reason: 'Недостаточно контекста' },
        }),
    );
});
