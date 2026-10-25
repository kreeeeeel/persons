import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PersonRestrictionsDialog } from '@persons/person-domain/PersonRestrictionsDialog';
import { renderUi } from '@test/render';

const api = vi.hoisted(() => ({ detail: vi.fn(), restriction: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { admin: { getAdminPerson: api.detail }, restrictions: { getUserRestriction: api.restriction } },
    personError: async () => 'UNAVAILABLE',
}));
afterEach(() => {
    cleanup();
    vi.resetAllMocks();
});
const profile = { id: 'person-id', fullName: 'Вадим' };

it('loads restrictions for the current linked account rather than using the person ID', async () => {
    api.detail.mockResolvedValueOnce({ id: profile.id, ownerAccountId: 'account-id' });
    api.restriction.mockResolvedValueOnce({});
    renderUi(
        <PersonRestrictionsDialog profile={profile} onClose={vi.fn()} onSaved={vi.fn()} onLinkAccount={vi.fn()} />,
    );
    await waitFor(() => expect(api.restriction).toHaveBeenCalledWith({ id: 'account-id' }, expect.anything()));
    expect(api.detail).toHaveBeenCalledWith({ id: profile.id }, expect.anything());
    expect(await screen.findByText('Владелец страницы «Вадим»')).toBeVisible();
});

it('offers account linking for an unlinked page and never submits a person ID to account restrictions', async () => {
    const link = vi.fn();
    api.detail.mockResolvedValueOnce({ id: profile.id });
    renderUi(<PersonRestrictionsDialog profile={profile} onClose={vi.fn()} onSaved={vi.fn()} onLinkAccount={link} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Привязка аккаунта' }));
    expect(link).toHaveBeenCalledOnce();
    expect(api.restriction).not.toHaveBeenCalled();
});

it('keeps a failed owner lookup retryable without opening account restrictions', async () => {
    api.detail.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce({ id: profile.id });
    renderUi(
        <PersonRestrictionsDialog profile={profile} onClose={vi.fn()} onSaved={vi.fn()} onLinkAccount={vi.fn()} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Попробовать ещё раз' }));
    expect(await screen.findByRole('button', { name: 'Привязка аккаунта' })).toBeVisible();
    expect(api.detail).toHaveBeenCalledTimes(2);
    expect(api.restriction).not.toHaveBeenCalled();
});
