import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { UserProfileDialog } from '@/modules/users/components/UserProfileDialog/UserProfileDialog';
import { renderUi } from '@test/render';

const api = vi.hoisted(() => ({ update: vi.fn(), refresh: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { accounts: { updateUserProfile: api.update } },
    personError: async () => 'INVALID_INPUT',
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: api.refresh }),
    usePathname: () => '/ru',
    useSearchParams: () => new URLSearchParams(),
}));
const user = {
    id: 'user',
    email: 'user@example.test',
    firstName: 'Иван',
    lastName: 'Петров',
    patronymic: 'Иванович',
    role: 'USER' as const,
    status: 'ACTIVE' as const,
    createdAt: '2026-10-21T12:00:00Z',
};
beforeEach(() => {
    vi.clearAllMocks();
    api.update.mockResolvedValue({ ...user });
});
afterEach(cleanup);

it('prefills all name fields and saves edits for the selected account', async () => {
    const saved = vi.fn();
    renderUi(<UserProfileDialog user={user} onClose={vi.fn()} onSaved={saved} />);
    expect(screen.getByLabelText('Отчество')).toHaveValue('Иванович');
    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Пётр' } });
    fireEvent.change(screen.getByLabelText('Отчество'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(api.update).toHaveBeenCalledWith({
        id: user.id,
        userProfileUpdate: {
            firstName: 'Пётр',
            lastName: 'Петров',
            patronymic: '',
        },
    });
    expect(api.refresh).toHaveBeenCalledOnce();
});

it('preserves drafts on failure and lets the administrator retry', async () => {
    api.update.mockRejectedValueOnce(new Error('Invalid input'));
    const saved = vi.fn();
    renderUi(<UserProfileDialog user={user} onClose={vi.fn()} onSaved={saved} />);
    fireEvent.change(screen.getByLabelText('Фамилия'), { target: { value: 'Иванов' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Проверьте введённые данные.');
    expect(screen.getByLabelText('Фамилия')).toHaveValue('Иванов');
    expect(saved).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Сохранить' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
});

it('cancels without changing the user and supports English in the dark theme', () => {
    const close = vi.fn();
    renderUi(<UserProfileDialog user={user} onClose={close} onSaved={vi.fn()} />, 'en', 'dark');
    expect(screen.getByRole('dialog', { name: 'Edit name' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(close).toHaveBeenCalledOnce();
    expect(api.update).not.toHaveBeenCalled();
});

it.each(['Имя', 'Фамилия', 'Отчество'])('limits %s and blocks saving overlong values', (label) => {
    renderUi(<UserProfileDialog user={user} onClose={vi.fn()} onSaved={vi.fn()} />);
    const input = screen.getByLabelText(label);
    expect(input).toHaveAttribute('maxlength', '10');
    fireEvent.change(input, { target: { value: 'я'.repeat(11) } });
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
    expect(api.update).not.toHaveBeenCalled();
});
