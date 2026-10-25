import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { BlockedScreen } from '@/modules/blocked/components/BlockedScreen/BlockedScreen';

const api = vi.hoisted(() => ({ site: vi.fn(), pages: vi.fn(), revokeSite: vi.fn(), revokePage: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: {
        restrictions: { listBlockedUsers: api.site, revokeUserRestriction: api.revokeSite },
        pageRestrictions: { listActivePageRestrictions: api.pages, revokePageRestriction: api.revokePage },
    },
    personError: async () => 'UNAVAILABLE',
    mediaHref: (id: string) => `/media/${id}`,
}));
afterEach(cleanup);

it('switches from site-wide to scoped restrictions and revokes the exact selected rule', async () => {
    const item = {
        id: 'site-rule',
        userId: 'author',
        userName: 'Вадим',
        scopes: new Set(['COMMENTS']),
        reason: 'Ограничение на сайте',
        createdAt: new Date(),
    };
    api.site.mockResolvedValue({ items: [item], total: 1, page: 0, size: 20 });
    api.pages
        .mockResolvedValueOnce({
            items: [
                {
                    ...item,
                    id: 'page-rule',
                    personId: 'page',
                    personTag: 'demo',
                    personName: 'Кирилл',
                    reason: 'Запрет на странице',
                    active: true,
                },
            ],
            total: 1,
            page: 0,
            size: 20,
        })
        .mockResolvedValue({ items: [], total: 0, page: 0, size: 20 });
    api.revokePage.mockResolvedValue(undefined);
    renderUi(<BlockedScreen publicUrl="http://localhost:3002" />);
    expect(await screen.findByText('Ограничение на сайте')).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'На страницах' }));
    expect(await screen.findByText('Запрет на странице')).toBeVisible();
    expect(screen.getByText('@demo')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Действия: Вадим' }));
    fireEvent.click(await screen.findByText('Снять ограничение'));
    await waitFor(() => expect(api.revokePage).toHaveBeenCalledWith({ id: 'author', restrictionId: 'page-rule' }));
    expect(api.revokeSite).not.toHaveBeenCalled();
    expect(await screen.findByText('Действующих ограничений нет')).toBeVisible();
});
