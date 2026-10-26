import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MediaUploader } from '@persons/person-domain/MediaUploader';
import { renderUi } from '@test/render';

beforeEach(() => {
    vi.stubGlobal(
        'URL',
        class extends URL {
            static createObjectURL() {
                return 'blob:preview';
            }
            static revokeObjectURL() {}
        },
    );
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

it.each([
    { kind: 'PHOTO', bytes: 32 * 1024 * 1024, mime: 'image/jpeg', name: 'photo.jpg' },
    { kind: 'MOMENT', bytes: 512 * 1024 * 1024, mime: 'video/mp4', name: 'moment.mp4' },
] as const)('accepts the $kind limit and opens its separate preview before upload', ({ kind, bytes, mime, name }) => {
    renderUi(<MediaUploader personId="person" kind={kind} onClose={vi.fn()} onSaved={vi.fn()} />);
    const allowed = new File(['file'], name, { type: mime });
    Object.defineProperty(allowed, 'size', { value: bytes });
    const input = screen.getByLabelText('Выбрать файл', { selector: 'input' });
    fireEvent.change(input, { target: { files: [allowed] } });
    expect(screen.getByText(name)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Загрузить' })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: 'Подпись' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeVisible();
});

it.each([
    { kind: 'PHOTO', bytes: 32 * 1024 * 1024, mime: 'image/jpeg' },
    { kind: 'MOMENT', bytes: 512 * 1024 * 1024, mime: 'video/mp4' },
] as const)('rejects an oversized $kind before creating a preview or starting a transfer', ({ kind, bytes, mime }) => {
    renderUi(<MediaUploader personId="person" kind={kind} onClose={vi.fn()} onSaved={vi.fn()} />);
    const oversized = new File(['file'], 'large', { type: mime });
    Object.defineProperty(oversized, 'size', { value: bytes + 1 });
    fireEvent.change(screen.getByLabelText('Выбрать файл', { selector: 'input' }), { target: { files: [oversized] } });
    expect(screen.getByText('Файл слишком большой.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Загрузить' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Отмена' })).toBeNull();
});

it('rejects unsupported MIME types in the shared picker', () => {
    renderUi(<MediaUploader personId="person" kind="PHOTO" onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Выбрать файл', { selector: 'input' }), {
        target: { files: [new File(['file'], 'program.exe', { type: 'application/octet-stream' })] },
    });
    expect(screen.queryByRole('textbox', { name: 'Подпись' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Загрузить' })).toBeNull();
});

it('keeps captions separate when switching selected files', () => {
    let id = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:preview-${id++}`);
    renderUi(<MediaUploader personId="person" kind="PHOTO" onClose={vi.fn()} onSaved={vi.fn()} />);
    const files = ['first.jpg', 'second.jpg'].map((name) => new File(['file'], name, { type: 'image/jpeg' }));
    fireEvent.change(screen.getByLabelText('Выбрать файл', { selector: 'input' }), { target: { files } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Подпись' }), { target: { value: 'First caption' } });
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByText('second.jpg')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Подпись' })).toHaveValue('');
    fireEvent.change(screen.getByRole('textbox', { name: 'Подпись' }), { target: { value: 'Second caption' } });
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect(screen.getByRole('textbox', { name: 'Подпись' })).toHaveValue('First caption');
});

it('opens the common picker directly and chooses each preview from its file in a mixed selection', () => {
    let id = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:mixed-${id++}`);
    renderUi(<MediaUploader personId="person" onClose={vi.fn()} onSaved={vi.fn()} />);
    const picker = screen.getByLabelText('Выбрать файл', { selector: 'input' });
    expect(picker).toHaveAttribute('accept', expect.stringContaining('image/jpeg'));
    expect(picker).toHaveAttribute('accept', expect.stringContaining('video/mp4'));
    expect(screen.queryByRole('textbox', { name: 'Подпись' })).not.toBeInTheDocument();
    fireEvent.change(picker, {
        target: {
            files: [
                new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }),
                new File(['video'], 'video.mp4', { type: 'video/mp4' }),
            ],
        },
    });
    expect(screen.getByText('Предпросмотр фотографии')).toBeVisible();
    fireEvent.change(screen.getByRole('textbox', { name: 'Подпись' }), { target: { value: 'Photo caption' } });
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByText('Предпросмотр видео')).toBeVisible();
    expect(document.querySelector('video')).toHaveAttribute('src', 'blob:mixed-1');
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect(screen.getByRole('textbox', { name: 'Подпись' })).toHaveValue('Photo caption');
});
