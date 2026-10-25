import { Box, Text } from '@gravity-ui/uikit';
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LocalizedContent } from '@/app/_providers/LocalizedContent/LocalizedContent';
const user = vi.hoisted(() => vi.fn());
vi.mock('@/shared/dynamicProperties/server', () => ({
    dynamicPropertyProxy: { initialize: vi.fn().mockResolvedValue(undefined), snapshot: () => [] },
}));
vi.mock('@/modules/account/server/currentUser', () => ({ currentUser: user }));
vi.mock('next-intl/server', () => ({ getMessages: async () => ({}) }));
vi.mock('@/shared/config/server', () => ({
    getServerConfig: () => ({ personPublicUrl: 'http://localhost:3002', idPublicUrl: 'http://localhost:3000' }),
}));
vi.mock('@/app/_providers/AppProviders/AppProviders', () => ({
    AppProviders: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/shared/ui/PageShell/PageShell', () => ({
    PageShell: ({ children }: { children: ReactNode }) => (
        <>
            <Box as="nav">{'CMS navigation'}</Box>
            {children}
        </>
    ),
}));
vi.mock('@/modules/users/components/AccessGate/AccessGate', () => ({
    AccessGate: () => <Box as="main">{'Checkpoint'}</Box>,
}));
afterEach(cleanup);
const props = {
    locale: 'ru' as const,
    preference: 'light' as const,
    resolvedTheme: 'light' as const,
    children: <Text>{'Private content'}</Text>,
};
it('renders the checkpoint without navigation or private content for a regular user', async () => {
    user.mockResolvedValue({ role: 'USER' });
    render(await LocalizedContent(props));
    expect(screen.getByText('Checkpoint')).toBeVisible();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByText('Private content')).not.toBeInTheDocument();
});
it('renders the complete CMS for an administrator', async () => {
    user.mockResolvedValue({ role: 'ADMIN' });
    render(await LocalizedContent(props));
    expect(screen.getByRole('navigation')).toBeVisible();
    expect(screen.getByText('Private content')).toBeVisible();
});
