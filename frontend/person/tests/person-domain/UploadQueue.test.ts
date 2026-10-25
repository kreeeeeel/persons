import { expect, it, vi } from 'vitest';
import { UploadQueue } from '@persons/person-domain/uploads/UploadQueue';
import type { UploadInput, UploadTransfer } from '@persons/person-domain/uploads/UploadQueue.types';

const receipt = { id: 'review', status: 'PENDING' as const };
const input = (name: string): UploadInput => ({
    personId: 'person',
    kind: 'PHOTO',
    file: new File(['photo'], name, { type: 'image/jpeg' }),
    caption: name,
    taggedPersonIds: ['friend'],
});

it('uploads sequentially, keeps per-file progress and starts the next request after success', async () => {
    const finish: Array<(value: typeof receipt) => void> = [];
    const transfer = vi.fn<UploadTransfer>((_input, _signal, update) => {
        update(37, 'UPLOADING');
        return new Promise((resolve) => finish.push(resolve));
    });
    const queue = new UploadQueue(transfer);
    queue.enqueue([input('first.jpg'), input('second.jpg')]);
    expect(transfer).toHaveBeenCalledTimes(1);
    expect(queue.snapshot().map(({ status, progress }) => [status, progress])).toEqual([
        ['UPLOADING', 37],
        ['QUEUED', 0],
    ]);
    finish[0](receipt);
    await vi.waitFor(() => expect(transfer).toHaveBeenCalledTimes(2));
    expect(queue.snapshot()[0]).toMatchObject({ status: 'DONE', progress: 100, receipt });
    finish[1](receipt);
    await vi.waitFor(() => expect(queue.snapshot()[1].status).toBe('DONE'));
});

it('aborts active uploads, skips cancelled queued files and continues after an error', async () => {
    const transfer = vi
        .fn<UploadTransfer>()
        .mockImplementationOnce(
            (_input, signal) =>
                new Promise((_, reject) =>
                    signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError'))),
                ),
        )
        .mockRejectedValueOnce(new Error('STORAGE_UNAVAILABLE'))
        .mockResolvedValueOnce(receipt);
    const queue = new UploadQueue(transfer);
    const ids = queue.enqueue([input('first.jpg'), input('skipped.jpg'), input('failed.jpg'), input('last.jpg')]);
    queue.cancel(ids[1]);
    queue.cancel(ids[0]);
    await vi.waitFor(() => expect(queue.snapshot()[3].status).toBe('DONE'));
    expect(transfer.mock.calls.map(([entry]) => entry.file.name)).toEqual(['first.jpg', 'failed.jpg', 'last.jpg']);
    expect(queue.snapshot().map(({ status }) => status)).toEqual(['CANCELLED', 'CANCELLED', 'ERROR', 'DONE']);
    queue.dismiss(ids[0]);
    expect(queue.snapshot()).toHaveLength(3);
});

it('ignores stale progress and completion after cancellation', async () => {
    let finish!: (value: typeof receipt) => void;
    let report!: Parameters<UploadTransfer>[2];
    const queue = new UploadQueue((_input, _signal, update) => {
        report = update;
        return new Promise((resolve) => {
            finish = resolve;
        });
    });
    const [id] = queue.enqueue([input('photo.jpg')]);
    queue.cancel(id);
    report(100, 'PROCESSING');
    finish(receipt);
    await Promise.resolve();
    expect(queue.snapshot()[0]).toMatchObject({ status: 'CANCELLED', progress: 0 });
});
