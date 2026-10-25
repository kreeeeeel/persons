import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { ReviewCard } from '@/modules/person/components/ReviewCard/ReviewCard';

const decide = vi.hoisted(() => vi.fn());
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { admin: { decideModeration: decide } },
    personError: async () => 'UNAVAILABLE',
}));
const item = {
    id: 'review',
    personId: 'person',
    personTag: 'vadim',
    kind: 'CREATE_COMMENT' as const,
    summary: 'Новый комментарий',
    payload: '{"text":"Проверяемая история"}',
    authorName: 'Крел',
    status: 'PENDING' as const,
    createdAt: new Date(),
};

beforeEach(() => {
    vi.clearAllMocks();
    decide.mockResolvedValue(item);
});
afterEach(cleanup);

it('shows the proposed content and requires a reason before rejecting it', async () => {
    const saved = vi.fn();
    renderUi(<ReviewCard item={item} publicUrl="http://localhost:3002" onSaved={saved} />);
    expect(screen.getByRole('button', { name: 'Согласовать' })).toBeEnabled();
    expect(screen.getByText('Проверяемая история')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Отклонить' }));
    expect(screen.getByText('Для отклонения укажите причину.')).toBeInTheDocument();
    expect(decide).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Причина решения' }), {
        target: { value: 'Нужно уточнение' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Отклонить' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(decide).toHaveBeenCalledWith({
        id: 'review',
        decisionInput: { decision: 'REJECT', reason: 'Нужно уточнение' },
    });
});

it('approves a request without requiring its details to be expanded', async () => {
    const saved = vi.fn();
    renderUi(<ReviewCard item={item} publicUrl="http://localhost:3002" onSaved={saved} />);
    fireEvent.click(screen.getByRole('button', { name: 'Согласовать' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(decide).toHaveBeenCalledWith({ id: 'review', decisionInput: { decision: 'APPROVE', reason: undefined } });
});
