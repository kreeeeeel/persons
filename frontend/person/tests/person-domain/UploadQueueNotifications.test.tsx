import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { UploadQueueProvider } from '@persons/person-domain/UploadQueueProvider';
import { UploadQueue } from '@persons/person-domain/uploads/UploadQueue';
import { renderUi } from '@test/render';

afterEach(cleanup);
const file = (name: string) => ({
    personId: 'person',
    kind: 'PHOTO' as const,
    file: new File(['photo'], name, { type: 'image/jpeg' }),
    caption: '',
    taggedPersonIds: [],
});

it('shows the newest three rows and opens the complete queue without duplicating transfers', async () => {
    const transfer = vi.fn((_input, signal: AbortSignal, update) => {
        update(27, 'UPLOADING');
        return new Promise<never>((_, reject) =>
            signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError'))),
        );
    });
    const queue = new UploadQueue(transfer);
    renderUi(
        <UploadQueueProvider queue={queue}>
            <></>
        </UploadQueueProvider>,
    );
    let ids: string[] = [];
    act(() => {
        ids = queue.enqueue(['one.jpg', 'two.jpg', 'three.jpg', 'four.jpg'].map(file));
    });
    expect(screen.getAllByRole('status')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Посмотреть всё · 4' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByRole('status')).toHaveLength(4);
    expect(transfer).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Отменить загрузку: one.jpg' }));
    await waitFor(() => expect(transfer).toHaveBeenCalledTimes(2));
    expect(queue.snapshot()[0].status).toBe('CANCELLED');
    act(() => ids.forEach((id) => queue.cancel(id)));
});

it('keeps the current transfer and progress when the provider remounts', async () => {
    let complete!: (value: { id: string; status: 'PENDING' }) => void;
    const transfer = vi.fn((_input, _signal, update) => {
        update(42, 'UPLOADING');
        return new Promise<{ id: string; status: 'PENDING' }>((resolve) => {
            complete = resolve;
        });
    });
    const queue = new UploadQueue(transfer);
    const first = renderUi(
        <UploadQueueProvider queue={queue}>
            <></>
        </UploadQueueProvider>,
    );
    act(() => {
        queue.enqueue([file('continues.jpg')]);
    });
    expect(screen.getByRole('progressbar', { name: 'continues.jpg' })).toHaveAttribute('aria-valuenow', '42');
    first.unmount();
    renderUi(
        <UploadQueueProvider queue={queue}>
            <></>
        </UploadQueueProvider>,
    );
    expect(screen.getByRole('progressbar', { name: 'continues.jpg' })).toHaveAttribute('aria-valuenow', '42');
    expect(transfer).toHaveBeenCalledTimes(1);
    await act(async () => {
        complete({ id: 'review', status: 'PENDING' });
    });
    expect(screen.getByText('На модерации')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Скрыть загрузку: continues.jpg' }));
    expect(queue.snapshot()).toHaveLength(0);
});
