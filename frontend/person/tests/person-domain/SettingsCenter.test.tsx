import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PersonsThemeProvider } from '@persons/theme';
import { AccountActionsContext } from '@persons/person-domain/account/AccountActionsContext';
import { SettingsCenter } from '@persons/person-domain/account/components/SettingsCenter/SettingsCenter';
import { PLAYBACK_STORAGE_KEY } from '@persons/ui/VideoPlayer/playbackPreferences';
import { renderUi } from '@test/render';

const mocks = vi.hoisted(() => ({
    refresh: vi.fn(),
    push: vi.fn(),
    profile: vi.fn(),
    password: vi.fn(),
    sessions: vi.fn(),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mocks.refresh, push: mocks.push }),
    usePathname: () => '/kirill',
    useSearchParams: () => new URLSearchParams(),
}));

function openSettings(locale: 'ru' | 'en' = 'ru', theme: 'light' | 'dark' = 'light') {
    return renderUi(
        <PersonsThemeProvider preference={theme} resolvedTheme={theme} locale={locale}>
            <AccountActionsContext
                value={{
                    signOut: vi.fn(),
                    changeProfile: mocks.profile,
                    changeAvatar: vi.fn(),
                    changePassword: mocks.password,
                    beginEmailChange: vi.fn(),
                    confirmEmailChange: vi.fn(),
                    resendEmailCode: vi.fn(),
                    listAccountSessions: mocks.sessions,
                    endAccountSession: vi.fn(),
                    endOtherAccountSessions: vi.fn(),
                }}
            >
                <SettingsCenter
                    user={{ firstName: 'Кирилл', lastName: 'Тестовый', patronymic: 'Иванович', hasAvatar: false }}
                    onClose={vi.fn()}
                    onAvatarSaved={vi.fn()}
                />
            </AccountActionsContext>
        </PersonsThemeProvider>,
        locale,
        theme,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.profile.mockResolvedValue({ ok: true });
    mocks.sessions.mockResolvedValue({ ok: true, data: [] });
});
afterEach(cleanup);

it.each(['Имя', 'Фамилия', 'Отчество'])('limits %s and prevents submitting legacy overlong values', (label) => {
    openSettings();
    const input = screen.getByLabelText(label);
    expect(input).toHaveAttribute('maxlength', '10');
    fireEvent.change(input, { target: { value: 'я'.repeat(11) } });
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
    fireEvent.submit(input.closest('form')!);
    expect(mocks.profile).not.toHaveBeenCalled();
});

it('saves all name fields, retains drafts between sections and reports success', async () => {
    openSettings();
    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Иван' } });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Плеер' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Профиль' }));
    expect(screen.getByLabelText('Имя')).toHaveValue('Иван');
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
        expect(mocks.profile).toHaveBeenCalledWith({ firstName: 'Иван', lastName: 'Тестовый', patronymic: 'Иванович' }),
    );
    expect(await screen.findByText('Изменения сохранены')).toBeVisible();
});

it('retains the profile draft after a failed save', async () => {
    mocks.profile.mockResolvedValue({ ok: false, code: 'UNAVAILABLE' });
    openSettings();
    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Иван' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText('Не удалось сохранить профиль. Попробуйте ещё раз.')).toBeVisible();
    expect(screen.getByLabelText('Имя')).toHaveValue('Иван');
    expect(mocks.refresh).not.toHaveBeenCalled();
});

it('switches theme and language on a canonical person URL without navigating away', () => {
    openSettings();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Интерфейс' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Тёмная' }));
    expect(document.cookie).toContain('PERSONS_THEME=dark');
    fireEvent.click(screen.getByRole('radio', { name: 'English' }));
    expect(document.cookie).toContain('PERSONS_LOCALE=en');
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(mocks.push).not.toHaveBeenCalled();
});

it('persists playback preferences across reopening settings', () => {
    const view = openSettings();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Плеер' }));
    const volume = screen.getByRole('slider', { name: 'Громкость по умолчанию' });
    expect(volume).toHaveAttribute('aria-valuenow', '50');
    fireEvent.keyDown(volume, { key: 'ArrowRight', keyCode: 39 });
    fireEvent.click(screen.getByRole('switch', { name: 'Автовоспроизведение' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Запускать видео без звука' }));
    expect(JSON.parse(localStorage.getItem(PLAYBACK_STORAGE_KEY) ?? '{}')).toMatchObject({
        autoplay: true,
        muted: true,
        volume: 51,
    });
    view.unmount();
    openSettings('en', 'dark');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Player' }));
    expect(screen.getByRole('slider', { name: 'Default volume' })).toHaveAttribute('aria-valuenow', '51');
    expect(screen.getByRole('switch', { name: 'Autoplay' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Start videos muted' })).toBeChecked();
});

it('supports keyboard navigation and keeps sessions in a single dialog', async () => {
    openSettings();
    const profile = screen.getByRole('menuitem', { name: 'Профиль' });
    profile.focus();
    fireEvent.keyDown(profile, { key: 'End' });
    expect(screen.getByRole('menuitem', { name: 'Ограничения' })).toHaveFocus();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Сессии' }));
    expect(await screen.findByText('Других активных сеансов нет')).toBeVisible();
    expect(screen.getByAltText('Никита проверяет единственный ноутбук без других устройств')).toHaveAttribute(
        'src',
        '/media/empty-sessions-nikita-v1.webp',
    );
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(within(screen.getByRole('dialog')).getByText('Текущее устройство')).toBeVisible();
});

it('groups account, application and privacy settings in the requested order', () => {
    openSettings();
    expect(screen.getByText('Аккаунт')).toBeVisible();
    expect(screen.getByText('Приложение')).toBeVisible();
    expect(screen.getByText('Конфиденциальность')).toBeVisible();
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
        'Профиль',
        'Аватарка',
        'Интерфейс',
        'Плеер',
        'Почта',
        'Пароль',
        'Сессии',
        'Ограничения',
    ]);
});
