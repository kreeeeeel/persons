vi.mock('@/modules/account/actions/sessions', () => ({
    listAccountSessions: async () => ({ ok: true, data: [] }),
    endAccountSession: vi.fn(),
    endOtherAccountSessions: vi.fn(),
}));
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { AccountMenu } from '@/modules/account/components/AccountMenu/AccountMenu';

const mocks = vi.hoisted(() => ({ signOut: vi.fn(), refresh: vi.fn(), notifications: vi.fn(), read: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { notifications: { listNotifications: mocks.notifications, readNotifications: mocks.read } },
    personError: async () => 'UNAVAILABLE',
}));
vi.mock('@/modules/account/actions/signOut', () => ({ signOut: mocks.signOut }));
vi.mock('@/modules/account/actions/changeAvatar', () => ({ changeAvatar: vi.fn() }));
vi.mock('@/modules/account/actions/settings', () => ({
    changeProfile: vi.fn(),
    changePassword: vi.fn(),
    beginEmailChange: vi.fn(),
    confirmEmailChange: vi.fn(),
    resendEmailCode: vi.fn(),
}));
vi.mock('@persons/theme', () => ({ useThemeMenuItems: () => [{ text: 'Светлая', selected: true, action: vi.fn() }] }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mocks.refresh }),
    usePathname: () => '/ru',
    useSearchParams: () => new URLSearchParams(),
}));

const user = { firstName: 'Кирилл', lastName: 'Тестовый', hasAvatar: false };

it('embeds avatar controls in settings without opening another dialog', () => {
    renderUi(<AccountMenu user={user} profileHref="/ru/my-page" />);
    fireEvent.click(screen.getByRole('button', { name: 'Аккаунт: Кирилл' }));
    fireEvent.click(screen.getByText('Настройки'));
    expect(screen.getByRole('dialog', { name: 'Настройки' })).toBeVisible();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Аватарка' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Выбрать фотографию' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(screen.queryByRole('dialog', { name: 'Сменить фотографию' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Настройки' })).toBeVisible();
});

beforeEach(() => {
    vi.clearAllMocks();
    mocks.signOut.mockResolvedValue({ ok: true });
    mocks.notifications.mockResolvedValue({
        items: [
            {
                id: 'notification',
                kind: 'REJECTED',
                subject: 'Комментарий',
                reason: 'Нужны подробности',
                personTag: 'vadim',
                read: false,
                createdAt: new Date(),
            },
        ],
        total: 1,
        unread: 1,
        page: 0,
        size: 12,
    });
    mocks.read.mockResolvedValue(undefined);
});
afterEach(cleanup);

it('embeds password, email and sessions in the same settings modal', async () => {
    renderUi(<AccountMenu user={user} profileHref="/ru/my-page" />);
    fireEvent.click(screen.getByRole('button', { name: 'Аккаунт: Кирилл' }));
    fireEvent.click(screen.getByText('Настройки'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Пароль' }));
    expect(screen.getByLabelText('Новый пароль')).toBeVisible();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Почта' }));
    expect(screen.getByLabelText('Новая почта')).toBeVisible();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Сессии' }));
    expect(await screen.findByText('Других активных сеансов нет')).toBeVisible();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
});

it('shows moderation decisions in the account notifications dialog and marks them read', async () => {
    renderUi(<AccountMenu user={user} profileHref="/profile" />);
    fireEvent.click(screen.getByRole('button', { name: 'Аккаунт: Кирилл' }));
    fireEvent.click(screen.getByText('Уведомления'));
    expect(await screen.findByText('Нужны подробности')).toBeInTheDocument();
    expect(screen.getByText('Отклонено')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Прочитать все' }));
    await waitFor(() => expect(mocks.read).toHaveBeenCalledOnce());
});

it('opens profile and sessions destinations and signs out of the current device', async () => {
    renderUi(<AccountMenu user={user} profileHref="http://localhost:3000/ru/home#profile" />);
    fireEvent.click(screen.getByRole('button', { name: 'Аккаунт: Кирилл' }));

    expect(screen.getByText('Моя страница').closest('a')).toHaveAttribute(
        'href',
        'http://localhost:3000/ru/home#profile',
    );
    expect(screen.getByText('Настройки').closest('a')).toBeNull();
    fireEvent.click(screen.getByText('Выйти из устройства'));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
    expect(mocks.signOut).toHaveBeenCalledOnce();
});

it('keeps the account visible and exposes a retryable sign-out error', async () => {
    mocks.signOut.mockResolvedValue({ ok: false });
    renderUi(<AccountMenu user={user} profileHref="/profile" />, 'en', 'dark');
    fireEvent.click(screen.getByRole('button', { name: 'Account: Кирилл' }));
    fireEvent.click(screen.getByText('Sign out of this device'));

    expect(await screen.findByText('Unable to sign out. Please try again.')).toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();
});

it('groups the account menu and shows unread notifications on the right', async () => {
    renderUi(
        <AccountMenu
            user={{ ...user, role: 'ADMIN' }}
            profileHref="/ru/my-page"
            adminHref="http://localhost:3001/ru"
        />,
    );
    await screen.findByLabelText('Непрочитанных уведомлений: 1');
    fireEvent.click(screen.getByRole('button', { name: 'Аккаунт: Кирилл' }));
    const entries = screen.getAllByRole('menuitem');
    expect(entries.map((item) => item.textContent).filter(Boolean)).toEqual([
        'Моя страница',
        'Мои публикации',
        'Уведомления1',
        'Настройки',
        'Админка',
        'Выйти из устройства',
    ]);
    expect(screen.getByText('Админка').closest('a')).toHaveAttribute('href', 'http://localhost:3001/ru');
    expect(screen.getByText('Настройки').closest('[role="menuitem"]')?.querySelector('svg')).not.toBeNull();
    const notifications = screen.getByText('Уведомления').closest('[role="menuitem"]');
    expect(notifications?.querySelector('[aria-label="Непрочитанных уведомлений: 1"]')).toHaveTextContent('1');
});

it('links to own publications and hides admin controls for a regular account', () => {
    renderUi(<AccountMenu user={user} profileHref="/ru/my-page" adminHref="https://admin.test/ru" />);
    fireEvent.click(screen.getByRole('button', { name: 'Аккаунт: Кирилл' }));
    expect(screen.getByText('Мои публикации').closest('a')).toHaveAttribute('href', '/ru/my-publications');
    expect(screen.queryByText('Админка')).not.toBeInTheDocument();
});

it('clears the unread badge after reading and refreshes it when returning to the tab', async () => {
    renderUi(<AccountMenu user={user} profileHref="/ru/my-page" />);
    expect(await screen.findByLabelText('Непрочитанных уведомлений: 1')).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('button', { name: 'Аккаунт: Кирилл' }));
    fireEvent.click(screen.getByText('Уведомления'));
    await screen.findByText('Нужны подробности');
    mocks.notifications.mockResolvedValue({ items: [], total: 0, unread: 0, page: 0, size: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Прочитать все' }));
    await waitFor(() => expect(screen.queryByLabelText('Непрочитанных уведомлений: 1')).not.toBeInTheDocument());
    mocks.notifications.mockResolvedValue({ items: [], total: 120, unread: 120, page: 0, size: 1 });
    fireEvent.focus(window);
    expect(await screen.findByLabelText('Непрочитанных уведомлений: 120')).toHaveTextContent('99+');
});

it('does not show an unread badge when no notifications are unread', async () => {
    mocks.notifications.mockResolvedValue({ items: [], total: 0, unread: 0, page: 0, size: 1 });
    renderUi(<AccountMenu user={user} profileHref="/ru/my-page" />);
    await waitFor(() => expect(mocks.notifications).toHaveBeenCalled());
    expect(screen.queryByLabelText(/Непрочитанных уведомлений/)).not.toBeInTheDocument();
});
