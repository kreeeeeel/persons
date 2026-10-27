import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { UploadQueue } from '@persons/person-domain/uploads/UploadQueue';
import { UploadQueueProvider } from '@persons/person-domain/UploadQueueProvider';
import { MediaUploader } from '@persons/person-domain/MediaUploader';
import { ProfileEditor } from '@persons/person-domain/ProfileEditor';
import { renderUi } from '@test/render';

const api = vi.hoisted(() => ({ upload: vi.fn(), create: vi.fn(), prepare: vi.fn() }));
vi.mock('@persons/person-domain/media/prepareVideo', () => ({ prepareVideo: api.prepare }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { media: { uploadMedia: api.upload }, persons: { createPerson: api.create } },
    personError: async () => 'UNAVAILABLE',
}));
beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: vi.fn() });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: vi.fn() });
    api.upload.mockResolvedValue({ status: 'PENDING' });
    api.create.mockResolvedValue({ status: 'PENDING' });
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

it.each(['PHOTO', 'MOMENT'] as const)(
    'queues a %s with its caption, closes the preview and finishes in the background',
    async (kind) => {
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
        const transfer = vi.fn().mockResolvedValue({ id: 'receipt', status: 'PENDING' });
        const queue = new UploadQueue(transfer);
        const saved = vi.fn();
        const closed = vi.fn();
        renderUi(
            <UploadQueueProvider queue={queue}>
                <MediaUploader personId="person" kind={kind} onClose={closed} onSaved={saved} />
            </UploadQueueProvider>,
        );
        expect(screen.queryByRole('button', { name: 'Загрузить' })).not.toBeInTheDocument();
        const file = new File(['file'], kind === 'PHOTO' ? 'photo.png' : 'moment.mp4', {
            type: kind === 'PHOTO' ? 'image/png' : 'video/mp4',
        });
        fireEvent.change(screen.getByLabelText('Выбрать файл', { selector: 'input' }), { target: { files: [file] } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Подпись' }), { target: { value: 'Наш вечер' } });
        fireEvent.click(screen.getByRole('button', { name: 'Загрузить' }));
        expect(closed).toHaveBeenCalledOnce();
        expect(saved).not.toHaveBeenCalled();
        expect(transfer).toHaveBeenCalledWith(
            expect.objectContaining({ personId: 'person', file, kind, caption: 'Наш вечер', taggedPersonIds: [] }),
            expect.any(AbortSignal),
            expect.any(Function),
        );
        await waitFor(() =>
            expect(queue.snapshot()[0]).toMatchObject({ status: 'DONE', receipt: { status: 'PENDING' } }),
        );
    },
);

it('rejects an oversized avatar before opening the editor or making a request', async () => {
    renderUi(<MediaUploader personId="person" kind="AVATAR" onClose={vi.fn()} onSaved={vi.fn()} />);
    const file = new File(['image'], 'photo.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
    fireEvent.change(screen.getByLabelText('Выбрать фотографию', { selector: 'input' }), { target: { files: [file] } });
    expect(await screen.findByText('Фотография слишком большая. Выберите файл до 10 МБ.')).toBeInTheDocument();
    expect(api.upload).not.toHaveBeenCalled();
});

it('creates a persona with an optional last name and predefined rating choices', async () => {
    const saved = vi.fn();
    const view = renderUi(<ProfileEditor onClose={vi.fn()} onSaved={saved} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Тег страницы' }), { target: { value: 'new-person' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Имя' }), { target: { value: 'Новый' } });
    expect(screen.getByRole('textbox', { name: 'Фамилия' })).not.toBeRequired();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Социальные сети' }));
    const discord = screen.getByRole('textbox', { name: 'Discord · тег' });
    expect(discord).toHaveAttribute('type', 'text');
    fireEvent.change(discord, { target: { value: ' some_user ' } });
    expect(screen.queryByRole('textbox', { name: 'Значение' })).not.toBeInTheDocument();
    fireEvent.submit(view.container.ownerDocument.querySelector('form')!);
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(api.create.mock.calls[0][0].profileInput).toMatchObject({
        tag: 'new-person',
        firstName: 'Новый',
        lastName: '',
        socialLinks: [{ network: 'DISCORD', tag: 'some_user' }],
        ratingOptions: [
            { emoji: '💜', label: '💜' },
            { emoji: '🤝', label: '🤝' },
        ],
    });
});
