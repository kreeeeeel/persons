import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { UsersScreen } from '@/modules/users/screens/UsersScreen/UsersScreen';
import { renderUi } from '@test/render';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn() }),
    usePathname: () => '/ru',
    useSearchParams: () => new URLSearchParams(),
}));

const api = vi.hoisted(() => ({ list: vi.fn(), sessions: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { accounts: { listAdminUsers: api.list, listUserSessions: api.sessions } },
    personError: async () => 'UNAVAILABLE',
}));
vi.mock('@/modules/users/actions/access', () => ({ revokeSessions: vi.fn() }));
let intersect: IntersectionObserverCallback;

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe() {}
            disconnect() {}
            unobserve() {}
        },
    );
    vi.stubGlobal(
        'IntersectionObserver',
        class {
            constructor(callback: IntersectionObserverCallback) {
                intersect = callback;
            }
            observe() {}
            disconnect() {}
        },
    );
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

function page(number: number, name: string, total = 21) {
    return {
        page: number,
        size: 20,
        total,
        items: [
            {
                id: name,
                firstName: name,
                lastName: '',
                email: `${name}@example.com`,
                role: 'USER',
                status: 'ACTIVE',
                createdAt: new Date(),
            },
        ],
    };
}

it('appends users on scroll, keeps previous rows and resets pagination after searching', async () => {
    api.list
        .mockResolvedValueOnce(page(0, 'Первый'))
        .mockResolvedValueOnce(page(1, 'Второй'))
        .mockResolvedValueOnce(page(0, 'Найденный', 1));
    renderUi(<UsersScreen search="" publicUrl="http://localhost:3002" />);
    expect(await screen.findByText('Первый')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Далее' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Загрузить ещё' })).not.toBeInTheDocument();
    act(() => intersect([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(await screen.findByText('Второй')).toBeVisible();
    expect(screen.getByText('Первый')).toBeVisible();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Найденный' } });
    expect(await screen.findByText('Найденный')).toBeVisible();
    expect(screen.queryByText('Первый')).not.toBeInTheDocument();
    expect(api.list.mock.calls.map(([query]) => [query.page, query.search])).toEqual([
        [0, ''],
        [1, ''],
        [0, 'Найденный'],
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Действия: Найденный' }));
    await waitFor(() => expect(screen.getByText('Изменить доступ')).toBeVisible());
});

it('keeps visible rows after a failed next page and retries that same page', async () => {
    api.list
        .mockResolvedValueOnce(page(0, 'Первый'))
        .mockRejectedValueOnce(new Error('Offline'))
        .mockResolvedValueOnce(page(1, 'Второй'));
    renderUi(<UsersScreen search="" publicUrl="http://localhost:3002" />);
    await screen.findByText('Первый');
    act(() => intersect([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    fireEvent.click(await screen.findByRole('button', { name: 'Попробовать ещё раз' }));
    expect(await screen.findByText('Второй')).toBeVisible();
    expect(screen.getByText('Первый')).toBeVisible();
    expect(api.list.mock.calls.map(([query]) => query.page)).toEqual([0, 1, 1]);
});

it('opens session IP inspection from the selected users actions', async () => {
    api.list.mockResolvedValueOnce(page(0, 'Кирилл', 1));
    api.sessions.mockResolvedValueOnce({ items: [] });
    renderUi(<UsersScreen search="" publicUrl="http://localhost:3002" />);
    await screen.findByText('Кирилл');
    fireEvent.click(screen.getByRole('button', { name: 'Действия: Кирилл' }));
    fireEvent.click(await screen.findByText('Сеансы и IP'));
    expect(await screen.findByRole('dialog', { name: 'Сеансы и IP' })).toBeVisible();
    expect(await screen.findByText('У пользователя нет активных сеансов')).toBeVisible();
    expect(api.sessions).toHaveBeenCalledWith({ id: 'Кирилл' }, { signal: expect.any(AbortSignal) });
});

it('opens account name editing from the selected users actions', async () => {
    api.list.mockResolvedValueOnce(page(0, 'Кирилл', 1));
    renderUi(<UsersScreen search="" publicUrl="http://localhost:3002" />);
    await screen.findByText('Кирилл');
    fireEvent.click(screen.getByRole('button', { name: 'Действия: Кирилл' }));
    fireEvent.click(await screen.findByText('Изменить ФИО'));
    expect(await screen.findByRole('dialog', { name: 'Изменить ФИО' })).toBeVisible();
    expect(screen.getByLabelText('Имя')).toHaveValue('Кирилл');
});

it('loads the selected account avatar while keeping its identity visible when opening actions', async () => {
    const images: HTMLImageElement[] = [];
    vi.stubGlobal(
        'Image',
        class {
            constructor() {
                const image = document.createElement('img');
                images.push(image);
                return image;
            }
        },
    );
    const user = page(0, 'Кирилл', 1);
    user.items[0].id = '11111111-1111-4111-8111-111111111111';
    api.list.mockResolvedValueOnce(user);
    renderUi(<UsersScreen search="" publicUrl="http://localhost:3002" />);
    const name = await screen.findByText('Кирилл');
    const email = screen.getByText('Кирилл@example.com');
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe('/api/users/11111111-1111-4111-8111-111111111111/avatar');

    act(() => images[0].dispatchEvent(new Event('error')));
    fireEvent.click(screen.getByRole('button', { name: 'Действия: Кирилл' }));
    expect(await screen.findByText('Изменить ФИО')).toBeVisible();
    expect(name).toBeVisible();
    expect(email).toBeVisible();
});
