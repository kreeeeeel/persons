import { act, cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AchievementsScreen } from '@/modules/achievements/screens/AchievementsScreen/AchievementsScreen';
import { renderUi } from '@test/render';

const api = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { achievements: { listAchievements: api.list } },
    personError: async () => 'UNAVAILABLE',
}));
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

it('appends the next achievement batch when scrolled without replacing existing cards', async () => {
    let intersect: IntersectionObserverCallback;
    const observe = vi.fn();
    vi.stubGlobal(
        'IntersectionObserver',
        class {
            constructor(callback: IntersectionObserverCallback) {
                intersect = callback;
            }
            observe = observe;
            disconnect() {}
        },
    );
    const achievement = (id: string) => ({
        id,
        title: id,
        description: 'Описание',
        active: true,
        type: 'MANUAL',
        version: 1,
    });
    api.list
        .mockResolvedValueOnce({ page: 0, size: 12, total: 13, items: [achievement('Первое')] })
        .mockResolvedValueOnce({ page: 1, size: 12, total: 13, items: [achievement('Последнее')] });
    renderUi(<AchievementsScreen />);
    await screen.findByText('Первое');
    await waitFor(() => expect(observe).toHaveBeenCalled());
    act(() => intersect([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(await screen.findByText('Последнее')).toBeVisible();
    expect(screen.getByText('Первое')).toBeVisible();
    expect(api.list.mock.calls.map(([query]) => query.page)).toEqual([0, 1]);
    expect(screen.queryByRole('button', { name: 'Далее' })).not.toBeInTheDocument();
});
