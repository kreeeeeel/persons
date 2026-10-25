import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { UserRestrictionDialog } from '@persons/person-domain/UserRestrictionDialog';
import { renderUi } from '@test/render';

const api = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { restrictions: { getUserRestriction: api.get, setUserRestriction: api.save } },
    personError: async () => 'UNAVAILABLE',
}));
afterEach(cleanup);

it('edits an actual date and time control and sends a typed expiry and scope set', async () => {
    api.get.mockResolvedValue({
        signedIn: true,
        restriction: {
            scopes: ['COMMENTS'],
            reason: 'Пауза в комментариях',
            expiresAt: new Date('2027-02-01T10:00:00Z'),
        },
    });
    api.save.mockResolvedValue({});
    const saved = vi.fn();
    renderUi(<UserRestrictionDialog userId="user" name="Вадим" onClose={vi.fn()} onSaved={saved} />);
    const control = await screen.findByLabelText('Действует до');
    expect(control).toHaveAttribute('type', 'datetime-local');
    fireEvent.change(control, { target: { value: '2027-02-02T12:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
        expect(api.save).toHaveBeenCalledWith({
            id: 'user',
            restrictionInput: {
                scopes: new Set(['COMMENTS']),
                reason: 'Пауза в комментариях',
                expiresAt: new Date('2027-02-02T12:30'),
            },
        }),
    );
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
});
