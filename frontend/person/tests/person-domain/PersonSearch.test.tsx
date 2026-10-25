import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PersonSearchPage } from '@persons/person-client';
import { PersonSearch } from '@persons/person-domain/PersonSearch';
import { renderUi } from '@test/render';

const api = vi.hoisted(() => ({ search: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: api.push }), usePathname: () => null }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { persons: { searchPersons: api.search } },
    mediaHref: (id: string) => `/media/${id}`,
}));
const page: PersonSearchPage = {
    items: [
        { id: 'vadim', fullName: 'Вадим', tag: 'vadim' },
        { id: 'krel', fullName: 'Крел', tag: 'krel' },
    ],
    total: 2,
    page: 0,
    size: 8,
};

beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    api.search.mockResolvedValue(page);
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

async function typeQuery(value = 'Вадим') {
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value } });
    await act(() => vi.advanceTimersByTimeAsync(350));
    return input;
}

it('debounces compact search, shows skeletons and supports keyboard navigation', async () => {
    renderUi(<PersonSearch variant="compact" />);
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('placeholder', 'Найти человека');
    fireEvent.change(input, { target: { value: 'Ва' } });
    expect(screen.getByRole('status', { name: 'Ищем своих…' })).toBeVisible();
    expect(api.search).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(350));
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(input).toHaveAttribute('aria-controls', screen.getByRole('listbox').id);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: /Крел/ })).toHaveAttribute('aria-selected', 'true');
    fireEvent.submit(screen.getByRole('search'));
    expect(api.push).toHaveBeenCalledWith('/krel');
    expect(input).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});

it('shows an empty state and lets the user retry a failed request', async () => {
    api.search.mockRejectedValueOnce(new Error('offline'));
    api.search.mockResolvedValueOnce({ ...page, items: [], total: 0 });
    renderUi(<PersonSearch />);
    await typeQuery();
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось выполнить поиск');
    fireEvent.click(screen.getByRole('button', { name: 'Попробовать ещё раз' }));
    await act(() => vi.advanceTimersByTimeAsync(350));
    expect(screen.getByText('Пока никого не нашли')).toBeVisible();
    expect(screen.getByAltText('Артём ищет людей с лупой в пустой картотеке')).toHaveAttribute(
        'src',
        '/media/empty-search-artem-v1.webp',
    );
    expect(api.search).toHaveBeenCalledTimes(2);
});

it('closes results on escape, selection and outside focus', async () => {
    renderUi(<PersonSearch />);
    const input = await typeQuery();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
    fireEvent.focus(input);
    fireEvent.blur(input, { relatedTarget: document.body });
    expect(input).toHaveAttribute('aria-expanded', 'false');
    fireEvent.focus(input);
    const option = screen.getByRole('option', { name: /Вадим/ });
    expect(option).toHaveAttribute('href', '/vadim');
    fireEvent.click(option);
    expect(input).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});

it('gives hero and compact instances separate accessible identifiers', () => {
    renderUi(
        <>
            <PersonSearch />
            <PersonSearch variant="compact" />
        </>,
        'en',
        'dark',
    );
    const inputs = screen.getAllByRole('combobox');
    expect(inputs[0]).toHaveAttribute('placeholder', 'Who comes to mind?');
    expect(inputs[1]).toHaveAttribute('placeholder', 'Find a person');
    expect(inputs[0].id).not.toBe(inputs[1].id);
});
