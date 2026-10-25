import { useState } from 'react';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PersonSummary } from '@persons/person-client';
import { PersonPicker } from '@persons/person-domain/PersonPicker';
import { renderUi } from '@test/render';

const search = vi.hoisted(() => vi.fn());
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { persons: { searchPersons: search } },
    mediaHref: (id: string) => `/media/${id}`,
    personError: async () => 'UNAVAILABLE',
}));
vi.mock('@persons/ui/useImageState', () => ({ useImageState: () => ({ ready: true }) }));
beforeEach(() => {
    vi.stubGlobal(
        'IntersectionObserver',
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        },
    );
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.resetAllMocks();
    vi.unstubAllGlobals();
});

function Picker() {
    const [people, setPeople] = useState<PersonSummary[]>([]);
    return <PersonPicker value={people} onChange={setPeople} />;
}

it('debounces people search and retains avatar and name when a person is selected', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    search.mockResolvedValue({
        items: [{ id: 'krel', fullName: 'Крел', tag: 'krel', avatarMediaId: 'avatar' }],
        total: 1,
        page: 0,
        size: 20,
    });
    renderUi(<Picker />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Кто отмечен' }));
    fireEvent.change(screen.getByPlaceholderText('Имя или тег персоны'), { target: { value: 'Кр' } });
    expect(search).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(349));
    expect(search).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    const option = screen.getByRole('option', { name: /Крел/ });
    expect(option.querySelector('img')).toHaveAttribute('src', '/media/avatar');
    fireEvent.click(option);
    const control = screen.getByRole('combobox', { name: 'Кто отмечен' });
    expect(within(control).getByText('Крел')).toBeVisible();
    expect(control.querySelector('img')).toHaveAttribute('src', '/media/avatar');
    expect(search).toHaveBeenCalledOnce();
});

it('illustrates an empty picker before typing and after an unsuccessful search', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    search.mockResolvedValue({ items: [], total: 0, page: 0, size: 20 });
    renderUi(<Picker />, 'en', 'dark');
    await act(async () => {});
    fireEvent.click(screen.getByRole('combobox', { name: 'People tagged' }));
    expect(screen.getByAltText('Artem searches an empty card catalogue with a magnifying glass')).toHaveAttribute(
        'src',
        '/media/empty-search-artem-v1.webp',
    );
    fireEvent.change(screen.getByPlaceholderText('Name or person tag'), { target: { value: 'Nobody' } });
    await act(() => vi.advanceTimersByTimeAsync(350));
    expect(search).toHaveBeenCalledOnce();
    expect(screen.getByAltText('Artem searches an empty card catalogue with a magnifying glass')).toBeInTheDocument();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
});
