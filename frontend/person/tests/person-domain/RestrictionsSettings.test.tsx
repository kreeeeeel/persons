import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RestrictionsSettings } from '@persons/person-domain/account/components/RestrictionsSettings/RestrictionsSettings';
import { renderUi } from '@test/render';

const mocks = vi.hoisted(() => ({ access: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { restrictions: { getAccessState: mocks.access } },
    personError: async () => 'UNAVAILABLE',
}));
const restriction = {
    id: 'restriction',
    userId: 'user',
    scopes: ['COMMENTS', 'LOANS'],
    reason: 'Спам в комментариях',
    createdAt: new Date('2026-01-01T00:00:00Z'),
};

beforeEach(() => {
    vi.clearAllMocks();
});
afterEach(cleanup);

it('shows the restricted actions, reason and expiration', async () => {
    mocks.access.mockResolvedValue({
        signedIn: true,
        restriction: { ...restriction, expiresAt: new Date('2099-11-21T12:00:00Z') },
    });
    renderUi(<RestrictionsSettings />);
    expect(await screen.findByText('Вам запрещено оставлять комментарии')).toBeVisible();
    expect(screen.getByText('Вам запрещено добавлять записи о займах')).toBeVisible();
    expect(screen.getByText('Спам в комментариях')).toBeVisible();
    expect(screen.getByText(/Ограничение действует до.*2099/)).toBeVisible();
});

it('shows permanent restrictions in English and the dark theme', async () => {
    mocks.access.mockResolvedValue({ signedIn: true, restriction });
    renderUi(<RestrictionsSettings />, 'en', 'dark');
    expect(await screen.findByText('You cannot leave comments')).toBeVisible();
    expect(screen.getByText('Forever')).toBeVisible();
});

it.each([undefined, { ...restriction, scopes: [] }, { ...restriction, expiresAt: new Date('2020-01-01T00:00:00Z') }])(
    'shows no active restrictions for an unrestricted account',
    async (restriction) => {
        mocks.access.mockResolvedValue({ signedIn: true, restriction });
        renderUi(<RestrictionsSettings />);
        expect(await screen.findByText('У вашего аккаунта нет действующих ограничений.')).toBeVisible();
        expect(screen.getByAltText('Юрий держит открытый замок рядом с пустым списком ограничений')).toHaveAttribute(
            'src',
            '/media/empty-restrictions-yuri-v1.webp',
        );
    },
);

it('offers retry when restrictions cannot be loaded', async () => {
    mocks.access.mockRejectedValueOnce(new Error('Unavailable'));
    mocks.access.mockResolvedValueOnce({ signedIn: true });
    renderUi(<RestrictionsSettings />);
    fireEvent.click(await screen.findByRole('button', { name: 'Попробовать ещё раз' }));
    expect(await screen.findByText('У вашего аккаунта нет действующих ограничений.')).toBeVisible();
    expect(mocks.access).toHaveBeenCalledTimes(2);
});

it('keeps the filled refresh button below the empty-state illustration and text', async () => {
    mocks.access.mockResolvedValue({ signedIn: true });
    renderUi(<RestrictionsSettings />);
    const description = await screen.findByText('У вашего аккаунта нет действующих ограничений.');
    const state = screen.getByRole('status');
    const button = within(state).getByRole('button', { name: 'Обновить' });
    expect(button).toHaveClass('g-button_view_normal');
    expect(description.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(button);
    await waitFor(() => expect(mocks.access).toHaveBeenCalledTimes(2));
});
