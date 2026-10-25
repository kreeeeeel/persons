import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { SessionsSettings } from '@/modules/account/components/SessionsSettings/SessionsSettings';

const actions = vi.hoisted(() => ({ list: vi.fn(), end: vi.fn(), others: vi.fn() }));
vi.mock('@/modules/account/actions/sessions', () => ({
    listAccountSessions: actions.list,
    endAccountSession: actions.end,
    endOtherAccountSessions: actions.others,
}));
const session = {
    id: 'current',
    current: true,
    os: 'Windows',
    osVersion: '11',
    browser: 'Chrome',
    ip: '127.0.0.1',
    region: '',
    createdAt: '2026-10-17T10:00:00Z',
};

beforeEach(() => {
    vi.clearAllMocks();
    actions.list.mockResolvedValue({
        ok: true,
        data: [session, { ...session, id: 'other', current: false, browser: 'Firefox' }],
    });
});
afterEach(cleanup);

it('opens the copied smart-house current-device and other-session layout and ends other devices', async () => {
    renderUi(<SessionsSettings />);
    expect(await screen.findByText('Chrome · Windows 11')).toBeInTheDocument();
    expect(screen.getByText('Текущее устройство')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /DB-IP/ })).not.toBeInTheDocument();
    expect(screen.getByText('Firefox · Windows 11')).toBeInTheDocument();
    actions.list.mockResolvedValue({ ok: true, data: [session] });
    actions.others.mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByRole('button', { name: 'Завершить другие сеансы' }));
    await waitFor(() => expect(actions.others).toHaveBeenCalledOnce());
    expect(await screen.findByText('Других активных сеансов нет')).toBeInTheDocument();
    expect(actions.end).not.toHaveBeenCalled();
});

it('offers a retry after a failed session load', async () => {
    actions.list.mockResolvedValueOnce({ ok: false, code: 'UNAVAILABLE' });
    renderUi(<SessionsSettings />);
    expect(await screen.findByRole('alert')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Попробовать ещё раз' }));
    expect(await screen.findByText('Chrome · Windows 11')).toBeVisible();
});
