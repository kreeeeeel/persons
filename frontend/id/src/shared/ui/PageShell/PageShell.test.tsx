import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { PageShell } from '@/shared/ui/PageShell/PageShell';
import { ScreenSkeleton } from '@/shared/ui/ScreenSkeleton/ScreenSkeleton';

const navigation = vi.hoisted(() => ({ pathname: '/ru' }));

vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }));

afterEach(cleanup);

it.each([
    ['ru', '/ru'],
    ['en', '/en'],
    ['ru', '/ru/recovery'],
    ['en', '/en/recovery'],
] as const)('renders only the logo and authentication content on %s %s', (locale, pathname) => {
    navigation.pathname = pathname;
    renderUi(
        <PageShell>
            <ScreenSkeleton />
        </PageShell>,
        locale,
    );

    const main = within(screen.getByRole('main'));

    expect(main.getByRole('img', { name: 'Те ещё люди' })).toHaveAttribute('src', '/media/logo.svg?v=vadim-v1');
    expect(main.getByRole('status', { name: locale === 'ru' ? 'Загрузка…' : 'Loading…' })).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(1);
});
