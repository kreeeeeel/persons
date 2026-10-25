import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { UserSessionsDialog } from '@/modules/users/components/UserSessionsDialog/UserSessionsDialog';
import { renderUi } from '@test/render';

const api = vi.hoisted(() => ({ sessions: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { accounts: { listUserSessions: api.sessions } },
    personError: async () => 'UNAVAILABLE',
}));
const session = {
    id: 'session',
    ip: '203.0.113.7',
    browser: 'Chrome',
    os: 'Windows',
    osVersion: '11',
    device: 'desktop',
    origin: 'persons-person-web',
    region: '',
    createdAt: new Date('2026-10-21T12:00:00Z'),
    lastSeenAt: new Date('2026-10-21T13:00:00Z'),
    expiresAt: new Date('2026-11-21T12:00:00Z'),
};
beforeEach(() => {
    vi.clearAllMocks();
    api.sessions.mockResolvedValue({ items: [session] });
});
afterEach(cleanup);

it('loads the selected users IP, client and activity details', async () => {
    renderUi(<UserSessionsDialog userId="user" name="Кирилл Тестовый" onClose={vi.fn()} />);
    expect(await screen.findByText('IP: 203.0.113.7')).toBeVisible();
    expect(screen.getByText('Chrome · Windows 11')).toBeVisible();
    expect(screen.getByText(/Вход выполнен:/)).toBeVisible();
    expect(screen.getByText(/Последняя активность:/)).toBeVisible();
    expect(api.sessions).toHaveBeenCalledWith({ id: 'user' }, { signal: expect.any(AbortSignal) });
});

it('refreshes the list and closes on request', async () => {
    const close = vi.fn();
    renderUi(<UserSessionsDialog userId="user" name="Кирилл" onClose={close} />);
    await screen.findByText('IP: 203.0.113.7');
    fireEvent.click(screen.getByRole('button', { name: 'Обновить' }));
    await waitFor(() => expect(api.sessions).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(close).toHaveBeenCalledOnce();
});

it('shows the empty state in English and the dark theme', async () => {
    api.sessions.mockResolvedValue({ items: [] });
    renderUi(<UserSessionsDialog userId="user" name="Kirill" onClose={vi.fn()} />, 'en', 'dark');
    expect(await screen.findByText('This user has no active sessions')).toBeVisible();
    expect(screen.getByAltText('Nikita checks a single laptop with no other devices')).toHaveAttribute(
        'src',
        '/media/empty-sessions-nikita-v1.webp',
    );
});

it('offers retry after a failed load without exposing stale IP data', async () => {
    api.sessions.mockRejectedValueOnce(new Error('Offline'));
    renderUi(<UserSessionsDialog userId="user" name="Кирилл" onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Попробовать ещё раз' }));
    expect(await screen.findByText('IP: 203.0.113.7')).toBeVisible();
});
