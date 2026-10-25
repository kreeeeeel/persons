import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { AccountScreen } from '@/modules/account/screens/AccountScreen/AccountScreen';

vi.mock('@/modules/id/actions/id', () => ({ signOut: vi.fn(), revokeSession: vi.fn() }));
vi.mock('next/navigation', () => ({
    usePathname: () => '/ru/home',
    useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
});

it.each([
    ['ru', 'light', 'Активных сеансов нет'],
    ['en', 'dark', 'No active sessions'],
] as const)('illustrates an empty session list in %s/%s', (locale, theme, label) => {
    renderUi(
        <AccountScreen
            user={{
                id: 'user',
                firstName: 'Крел',
                lastName: 'Персонаж',
                email: 'friend@example.test',
                locale,
                hasAvatar: false,
                role: 'USER',
            }}
            sessions={[]}
        />,
        locale,
        theme,
    );
    expect(screen.getByRole('status')).toHaveTextContent(label);
    expect(within(screen.getByRole('status')).getByRole('img')).toHaveAttribute(
        'src',
        '/media/empty-sessions-nikita-v1.webp',
    );
});

it('formats session timestamps in the configured timezone for matching server and browser text', () => {
    vi.stubEnv('TZ', 'UTC');

    renderUi(
        <AccountScreen
            user={{
                id: 'b434c58e-47fc-4e44-a978-2245b012ac6b',
                firstName: 'Крел',
                lastName: 'Персонаж',
                email: 'friend@example.test',
                locale: 'ru',
                hasAvatar: false,
                role: 'USER',
            }}
            sessions={[
                {
                    id: 'e5b922bb-d516-4be0-93d3-c0b6ce2b5336',
                    createdAt: '2026-10-17T12:00:00Z',
                    lastSeenAt: '2026-10-17T12:00:00Z',
                    expiresAt: '2026-11-16T12:00:00Z',
                    ip: '127.0.0.1',
                    userAgent: 'test',
                    os: 'test',
                    osVersion: '',
                    browser: 'test',
                    device: 'desktop',
                    origin: 'test',
                    region: '',
                    current: true,
                },
            ]}
        />,
    );

    expect(screen.getByText(/Вход:/)).toHaveTextContent('15:00');
});
