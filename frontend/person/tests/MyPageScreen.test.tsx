import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MyPageScreen } from '@/modules/account/components/MyPageScreen/MyPageScreen';
import { renderUi } from '@test/render';
import { Box } from '@gravity-ui/uikit';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }), usePathname: () => '/ru/my-page' }));
vi.mock('@/shared/ui/SiteHeader/SiteHeader', () => ({
    SiteHeader: ({ children }: { children: React.ReactNode }) => <Box as="header">{children}</Box>,
}));
vi.mock('@persons/person-domain/ProfileEditor', () => ({
    ProfileEditor: ({ ownRequest }: { ownRequest: boolean }) => (
        <Box role="dialog">{ownRequest ? 'Заявка на свою страницу' : 'Редактор'}</Box>
    ),
}));
afterEach(cleanup);

it('keeps the default header and opens a personal creation request', () => {
    renderUi(<MyPageScreen account="Аккаунт" pending={false} />);
    expect(screen.getByRole('banner')).toHaveTextContent('Аккаунт');
    expect(screen.getByRole('heading', { name: 'Вашей страницы пока нет' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Запросить создание страницы' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Заявка на свою страницу');
});

it('replaces the creation action with the pending request status', () => {
    renderUi(<MyPageScreen account="Аккаунт" pending />);
    expect(screen.getByRole('heading', { name: 'Страница на рассмотрении' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Запросить создание страницы' })).not.toBeInTheDocument();
});
