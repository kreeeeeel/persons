import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { ContentScreen } from '@/modules/content/components/ContentScreen/ContentScreen';

const api = vi.hoisted(() => ({ list: vi.fn(), hide: vi.fn(), decide: vi.fn() }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: vi.fn() }),
    usePathname: () => '/ru/content',
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: {
        contentAdmin: { listAdminContent: api.list, hideAdminContent: api.hide },
        admin: { decideModeration: api.decide },
    },
    mediaHref: (id: string) => `/media/${id}`,
    personError: async () => 'CONFLICT',
}));
const item = (id: string, status = 'PUBLISHED') => ({
    id,
    kind: 'COMMENT',
    status,
    personId: 'page',
    personTag: 'krel',
    personName: 'Кирилл',
    text: id,
    createdAt: new Date(),
    mediaAvailable: false,
    previewAvailable: false,
});
beforeEach(() => {
    vi.clearAllMocks();
    api.list.mockResolvedValue({
        items: [item('Первый'), { ...item('Второй'), pendingRequestId: 'request' }, item('Скрытый', 'HIDDEN')],
        total: 3,
        page: 0,
        size: 20,
        statistics: { published: 2, pending: 0, hidden: 1, draft: 0 },
    });
});
afterEach(cleanup);

it('selects visible eligible rows and opens bulk removal without opening a material', async () => {
    renderUi(<ContentScreen publicUrl="http://localhost:3002" />);
    await screen.findByRole('button', { name: 'Открыть: Первый' });
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать всё' }));
    expect(screen.getByText('Выбрано: 2')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Открыть: Скрытый' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Согласовать' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    expect(screen.getByRole('dialog', { name: 'Удалить материалы: 2' })).toBeVisible();
    expect(screen.queryByRole('dialog', { name: 'Просмотр публикации' })).not.toBeInTheDocument();
});

it('keeps only failed removal rows selected after a partial result', async () => {
    api.hide.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('conflict'));
    renderUi(<ContentScreen publicUrl="http://localhost:3002" />);
    await screen.findByRole('button', { name: 'Открыть: Первый' });
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать всё' }));
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Причина удаления' }), { target: { value: 'Причина' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Удалить' }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Выбрано: 1')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Открыть: Второй' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Открыть: Первый' })).not.toBeChecked();
});
