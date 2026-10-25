import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ReputationOverrideDialog } from '@persons/person-domain/ReputationOverrideDialog';
import { renderUi } from '@test/render';

const save = vi.hoisted(() => vi.fn());
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { reputationAdmin: { setReputationOverride: save } },
    personError: async () => 'UNAVAILABLE',
}));
beforeEach(() => save.mockResolvedValue({}));
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

it('saves the selected reputation directly and lets administrators restore automatic calculation', async () => {
    const saved = vi.fn();
    renderUi(
        <ReputationOverrideDialog
            profile={{ id: 'person', fullName: 'Вадим', reputationOverride: 'BAD' }}
            onClose={vi.fn()}
            onSaved={saved}
        />,
    );
    expect(screen.queryByRole('button', { name: 'Отправить на модерацию' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Репутация' })).toHaveTextContent('Плохая');
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
        expect(save).toHaveBeenCalledWith({ id: 'person', reputationOverrideInput: { reputation: 'BAD' } }),
    );
    fireEvent.click(screen.getByRole('combobox', { name: 'Репутация' }));
    fireEvent.click(screen.getByRole('option', { name: 'Автоматически' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
        expect(save).toHaveBeenLastCalledWith({ id: 'person', reputationOverrideInput: { reputation: undefined } }),
    );
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(2));
});

it('keeps the form open and allows retry after an API failure', async () => {
    save.mockRejectedValueOnce(new Error('offline'));
    const saved = vi.fn();
    renderUi(
        <ReputationOverrideDialog profile={{ id: 'person', fullName: 'Вадим' }} onClose={vi.fn()} onSaved={saved} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText('Не удалось связаться с сервисом. Попробуйте ещё раз.')).toBeVisible();
    expect(saved).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
});
