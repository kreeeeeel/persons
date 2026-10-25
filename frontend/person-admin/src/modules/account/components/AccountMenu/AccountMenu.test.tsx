import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { AccountMenu } from '@/modules/account/components/AccountMenu/AccountMenu';

vi.mock('@/modules/account/actions/signOut', () => ({ signOut: vi.fn() }));
vi.mock('@/modules/account/actions/changeAvatar', () => ({ changeAvatar: vi.fn() }));
vi.mock('@/modules/account/actions/settings', () => ({
    changeProfile: vi.fn(),
    changePassword: vi.fn(),
    beginEmailChange: vi.fn(),
    confirmEmailChange: vi.fn(),
    resendEmailCode: vi.fn(),
}));
vi.mock('@/modules/account/actions/sessions', () => ({
    listAccountSessions: async () => ({ ok: true, data: [] }),
    endAccountSession: vi.fn(),
    endOtherAccountSessions: vi.fn(),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn() }),
    usePathname: () => '/ru',
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@persons/theme', () => ({ useThemeMenuItems: () => [{ text: 'Светлая', selected: true, action: vi.fn() }] }));
afterEach(cleanup);

it('uses the common profile menu and translated photo editor in the CMS sidebar', () => {
    renderUi(
        <AccountMenu
            sidebar
            user={{ firstName: 'Крел', lastName: 'Демо', email: 'demo@example.test', hasAvatar: false, role: 'ADMIN' }}
            profileHref="https://people.test/ru/my-page"
            publicUrl="https://people.test"
        />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Аккаунт: Крел' }));
    expect(screen.getByText('Моя страница').closest('a')).toHaveAttribute('href', 'https://people.test/ru/my-page');
    fireEvent.click(screen.getByText('Настройки'));
    expect(screen.getByRole('dialog', { name: 'Настройки' })).toBeVisible();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Аватарка' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Выбрать фотографию' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Сохранить' }).at(-1)).toBeDisabled();
});
