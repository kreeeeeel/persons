import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { OwnershipDialog } from '@persons/person-domain/OwnershipDialog';

const submit = vi.hoisted(() => vi.fn());
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { claims: { claimPerson: submit } },
    personError: async () => 'UNAVAILABLE',
}));
beforeEach(() => {
    vi.clearAllMocks();
    submit.mockResolvedValue({ id: 'request', status: 'PENDING' });
});
afterEach(cleanup);

it('requires an explanation and evidence before sending an ownership claim', async () => {
    const onSaved = vi.fn();
    renderUi(<OwnershipDialog personId="person" onClose={vi.fn()} onSaved={onSaved} />);
    const button = screen.getByRole('button', {
        name: 'Отправить на модерацию',
    });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Как подтвердить, что это вы' }), {
        target: { value: 'Это моя страница, вот подтверждение' },
    });
    const file = new File(['image'], 'proof.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Доказательство · JPG или PNG до 12 МБ'), { target: { files: [file] } });
    fireEvent.click(button);
    await waitFor(() =>
        expect(submit).toHaveBeenCalledWith({
            id: 'person',
            message: 'Это моя страница, вот подтверждение',
            file,
        }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
});
