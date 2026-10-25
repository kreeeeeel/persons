import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Text } from '@gravity-ui/uikit';
import { PageShell } from '@/shared/ui/PageShell/PageShell';
import { renderUi } from '@test/render';

vi.mock('next/navigation', () => ({ usePathname: () => '/ru/settings' }));
vi.mock('@/modules/account/components/AccountMenu/AccountMenu', () => ({ AccountMenu: () => null }));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

function viewport(mobile: boolean) {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(max-width: 800px)' && mobile,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }));
}

it.each([
    ['ru', 'light', 'Открыть меню', 'Меню администрирования', 'Персоны'],
    ['en', 'dark', 'Open menu', 'Administration menu', 'Persons'],
] as const)(
    'opens and closes mobile navigation in %s/%s and returns focus',
    async (locale, theme, label, title, persons) => {
        viewport(true);
        renderUi(
            <PageShell user={null}>
                <Text>{'Content'}</Text>
            </PageShell>,
            locale,
            theme,
        );
        const trigger = screen.getByRole('button', { name: label });
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        trigger.focus();
        fireEvent.click(trigger);
        const drawer = await screen.findByRole('dialog', { name: title });
        expect(within(drawer).getByRole('link', { name: persons })).toHaveAttribute('href', `/${locale}/persons`);
        fireEvent.keyDown(drawer, { key: 'Escape', code: 'Escape' });
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        await waitFor(() => expect(trigger).toHaveFocus());
        fireEvent.click(trigger);
        const reopened = await screen.findByRole('dialog', { name: title });
        fireEvent.click(within(reopened).getByRole('link', { name: persons }), { ctrlKey: true });
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getByText('Content')).toBeVisible();
    },
);

it('keeps the desktop sidebar visible without opening a drawer', () => {
    viewport(false);
    renderUi(
        <PageShell user={null}>
            <Text>{'Content'}</Text>
        </PageShell>,
    );
    expect(screen.getByRole('navigation', { name: 'Разделы администрирования' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
