import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { FeedComposer } from '@/modules/feed/components/FeedComposer/FeedComposer';
import { previewPages } from '@test/fixtures/previewPages';

const targetProps = {
    target: previewPages[0],
    ownPage: previewPages[0],
    onTargetChange: vi.fn(),
};

beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: vi.fn().mockReturnValue('blob:review'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});
afterEach(cleanup);

it('publishes trimmed wall text and prevents an empty submission', async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    renderUi(<FeedComposer onPublish={publish} {...targetProps} />);
    expect(screen.getByRole('button', { name: 'Опубликовать' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Привет, люди!  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Опубликовать' }));
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''));
    expect(screen.queryByText('Отправлено')).not.toBeInTheDocument();
    expect(publish).toHaveBeenCalledWith('Привет, люди!', []);
    expect(screen.getByRole('textbox')).toHaveValue('');
});

it('keeps text and a photo after failure, then releases the preview after a successful retry', async () => {
    const publish = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    renderUi(<FeedComposer onPublish={publish} {...targetProps} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Наш вечер' } });
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить файлы' }));
    const files = [new File(['photo'], 'photo.png', { type: 'image/png' })];
    fireEvent.change(screen.getByLabelText('Выбрать файлы', { selector: 'input' }), { target: { files } });
    expect(screen.getByText('В фото · 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Опубликовать' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('textbox')).toHaveValue('Наш вечер');
    expect(screen.getByText('photo.png')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Опубликовать' }));
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(publish).toHaveBeenLastCalledWith('Наш вечер', files);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:review');
});

it('rejects unsupported files without losing the text and supports removing an attachment', async () => {
    renderUi(<FeedComposer onPublish={vi.fn()} {...targetProps} />, 'en', 'dark');
    fireEvent.click(screen.getByRole('button', { name: 'Upload files' }));
    fireEvent.change(screen.getByLabelText('Choose files', { selector: 'input' }), {
        target: { files: [new File(['x'], 'bad.txt', { type: 'text/plain' })] },
    });
    expect(screen.getByText('Choose JPG, PNG images or MP4, WebM, MOV videos.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Choose files', { selector: 'input' }), {
        target: { files: [new File(['image'], 'good.png', { type: 'image/png' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Remove file: good.png' }));
    await waitFor(() => expect(screen.queryByText('good.png')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
});
