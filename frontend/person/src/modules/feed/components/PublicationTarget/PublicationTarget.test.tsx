import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { PublicationTarget } from '@/modules/feed/components/PublicationTarget/PublicationTarget';
import { previewPages } from '@test/fixtures/previewPages';

const api = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { persons: { searchPersons: api.search } },
    mediaHref: (id: string) => `/media/${id}`,
}));
beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

it('shows the selected page without a radio and uses the dedicated search illustration', () => {
    renderUi(<PublicationTarget value={previewPages[0]} ownPage={previewPages[0]} onChange={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Где опубликовать' });
    expect(trigger).toHaveTextContent(previewPages[0].fullName);
    expect(screen.queryByText('Моя страница')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: previewPages[0].fullName })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByText('Найдите страницу')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', 'Найти человека');
    expect(
        screen.getByRole('dialog').querySelector('img[src="/media/search-pages-stepa-v1.webp"]'),
    ).toBeInTheDocument();
    expect(api.search).not.toHaveBeenCalled();
});

it('debounces search, shows result counts and selects a destination by clicking its row', async () => {
    api.search.mockResolvedValue({ items: [previewPages[1]], total: 1 });
    const change = vi.fn();
    renderUi(<PublicationTarget value={previewPages[0]} ownPage={previewPages[0]} onChange={change} />);
    fireEvent.click(screen.getByRole('button', { name: 'Где опубликовать' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'vadim' } });
    expect(screen.getByRole('status', { name: 'Ищем своих…' })).toBeInTheDocument();
    expect(api.search).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(350));
    const group = screen.getByRole('group');
    expect(within(group).getByRole('status')).toHaveTextContent('1');
    fireEvent.click(within(group).getByRole('button', { name: previewPages[1].fullName }));
    expect(change).toHaveBeenCalledWith(previewPages[1]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('allows returning to the own page and leaves it unselected when another page is active', () => {
    const change = vi.fn();
    renderUi(<PublicationTarget value={previewPages[1]} ownPage={previewPages[0]} onChange={change} />);
    fireEvent.click(screen.getByRole('button', { name: 'Где опубликовать' }));
    const own = screen.getByRole('button', { name: previewPages[0].fullName });
    expect(own).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(own);
    expect(change).toHaveBeenCalledWith(previewPages[0]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('supports search failure, retry and no results in English', async () => {
    api.search.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ items: [], total: 0 });
    renderUi(<PublicationTarget onChange={vi.fn()} />, 'en', 'dark');
    fireEvent.click(screen.getByRole('button', { name: 'Publish to' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nobody' } });
    await act(() => vi.advanceTimersByTimeAsync(350));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await act(() => vi.advanceTimersByTimeAsync(350));
    expect(screen.getByText('No one found yet')).toBeInTheDocument();
    expect(api.search).toHaveBeenCalledTimes(2);
});
