import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CreditFeed } from '@persons/person-domain/CreditFeed';
import { renderUi } from '@test/render';

const api = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), edit: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { interactions: { listCredit: api.list, createCredit: api.create, editCredit: api.edit } },
    personError: async () => 'UNAVAILABLE',
}));

beforeEach(() => {
    vi.resetAllMocks();
    api.list.mockResolvedValue({ items: [], total: 0, page: 0, size: 10 });
    api.create.mockResolvedValue({ status: 'PENDING' });
    api.edit.mockResolvedValue({ status: 'PENDING' });
});
afterEach(cleanup);

it('keeps the status and icon send button inside the loan field and submits the chosen status', async () => {
    renderUi(<CreditFeed personId="person" signedIn />);
    const input = screen.getByRole('textbox', { name: 'Почему вы так думаете?' });
    const status = screen.getByRole('combobox', { name: 'Займы' });
    const send = screen.getByRole('button', { name: 'Отправить' });
    expect(input.closest('form')).toContainElement(status);
    expect(input.closest('form')).toContainElement(send);
    expect(send).toBeDisabled();
    expect(send.textContent).toBe('');
    fireEvent.click(status);
    fireEvent.click(await screen.findByRole('option', { name: 'Возвращает с маленькой задержкой' }));
    expect(api.create).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'Вернул через неделю' } });
    fireEvent.click(send);
    await waitFor(() =>
        expect(api.create).toHaveBeenCalledWith({
            id: 'person',
            creditInput: { kind: 'SHORT_DELAY', description: 'Вернул через неделю' },
        }),
    );
    await waitFor(() => expect(input).toHaveValue(''));
});

it('keeps pending loan content editable and lets the author cancel without publishing', async () => {
    api.list.mockResolvedValue({
        items: [
            {
                id: 'loan',
                authorName: 'Система',
                kind: 'ON_TIME',
                description: 'Старая история',
                createdAt: new Date(),
                canRemove: true,
                moderationStatus: 'PENDING',
                likes: 0,
                dislikes: 0,
            },
        ],
        total: 1,
        page: 0,
        size: 10,
    });
    renderUi(<CreditFeed personId="person" signedIn />);
    fireEvent.click(await screen.findByRole('button', { name: 'Редактировать' }));
    const input = screen.getByRole('textbox', { name: 'Почему вы так думаете?' });
    expect(input).toHaveValue('Старая история');
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(input).not.toBeInTheDocument();
    expect(screen.getByText('Старая история')).toBeVisible();
    expect(api.edit).not.toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
});

it('requests only personal loans and replaces the card with an inline editor', async () => {
    api.list.mockResolvedValue({
        items: [
            {
                id: 'loan',
                authorName: 'Автор',
                kind: 'ON_TIME',
                description: 'Мой займ',
                createdAt: new Date(),
                canRemove: true,
            },
        ],
        total: 1,
        page: 0,
        size: 10,
    });
    renderUi(<CreditFeed personId="person" signedIn />);
    await screen.findByText('Мой займ');
    fireEvent.click(screen.getByRole('combobox', { name: 'Показать записи' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Мои' }));
    await waitFor(() =>
        expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ mine: true }), expect.anything()),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Редактировать' }));
    expect(screen.getByRole('textbox')).toHaveValue('Мой займ');
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Обновлённый займ' } });
    expect(api.edit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
        expect(api.edit).toHaveBeenCalledWith({
            id: 'loan',
            creditInput: { kind: 'ON_TIME', description: 'Обновлённый займ' },
        }),
    );
});
