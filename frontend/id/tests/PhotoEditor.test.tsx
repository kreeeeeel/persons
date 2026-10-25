import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CropperProps } from 'react-easy-crop';
import { PhotoEditor } from '@persons/photo-editor';
import { cropPhoto } from '@persons/photo-editor/crop';
import { renderUi } from '@test/render';

const WIDTH_512 = 512;
const HEIGHT_512 = 512;
const NATURAL_WIDTH_512 = 512;
const NATURAL_HEIGHT_512 = 512;
const X_0 = 0;
const Y_0 = 0;
const WIDTH_100 = 100;
const HEIGHT_100 = 100;
const AREA_0 = 0;
const TO_BE_LESS_THAN_512 = 512;
const TO_BE_GREATER_THAN_0 = 0;
const TO_HAVE_BEEN_LAST_CALLED_WITH_0 = 0;
const EDITOR_READY_TIMEOUT_MILLIS = 3000;

vi.mock('@persons/photo-editor/crop', () => ({ cropPhoto: vi.fn() }));
vi.mock('react-easy-crop', async () => {
    const { createElement, useEffect } = await import('react');

    return {
        default: function CropPreview({ onMediaLoaded, onCropComplete }: CropperProps) {
            useEffect(() => {
                onMediaLoaded?.({
                    width: WIDTH_512,
                    height: HEIGHT_512,
                    naturalWidth: NATURAL_WIDTH_512,
                    naturalHeight: NATURAL_HEIGHT_512,
                });
                onCropComplete?.(
                    { x: X_0, y: Y_0, width: WIDTH_100, height: HEIGHT_100 },
                    { x: X_0, y: Y_0, width: WIDTH_512, height: HEIGHT_512 },
                );
                // The image is loaded only once, matching the browser's media load event.
                // eslint-disable-next-line react-hooks/exhaustive-deps
            }, []);

            return createElement('img', { alt: 'Crop preview' });
        },
    };
});

beforeEach(() => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn((media: string) => ({
            media,
            matches: media === '(prefers-reduced-motion: reduce)',
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );
});

afterEach(() => {
    cleanup();
    vi.resetAllMocks();
    vi.unstubAllGlobals();
});

describe('photo editor controls', () => {
    it('saves a smaller moved crop when the frame is resized and moved with the keyboard', async () => {
        vi.mocked(cropPhoto).mockResolvedValueOnce('data:image/jpeg;base64,selection');
        renderUi(<PhotoEditor source="blob:photo" onSave={vi.fn()} onClose={vi.fn()} />);

        const corner = await screen.findByRole(
            'button',
            { name: 'Изменить область обрезки: нижний правый угол' },
            { timeout: EDITOR_READY_TIMEOUT_MILLIS },
        );

        fireEvent.keyDown(corner, { key: 'ArrowLeft' });
        fireEvent.keyDown(corner, { key: 'ArrowUp' });
        fireEvent.keyDown(screen.getByRole('button', { name: 'Переместить область обрезки' }), {
            key: 'ArrowRight',
        });
        fireEvent.click(screen.getByRole('button', { name: 'Применить' }));
        await waitFor(() => expect(cropPhoto).toHaveBeenCalledOnce());

        const [, area] = vi.mocked(cropPhoto).mock.calls[AREA_0];

        expect(area.width).toBeLessThan(TO_BE_LESS_THAN_512);
        expect(area.height).toBe(area.width);
        expect(area.x).toBeGreaterThan(TO_BE_GREATER_THAN_0);
    });

    it('embeds crop controls directly without creating a modal', async () => {
        const save = vi.fn();
        vi.mocked(cropPhoto).mockResolvedValueOnce('data:image/jpeg;base64,embedded');
        renderUi(<PhotoEditor embedded source="blob:photo" onSave={save} onClose={vi.fn()} />);
        await waitFor(() => expect(screen.getByRole('button', { name: 'Применить' })).toBeEnabled());
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Повернуть на 90°' })).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: 'Применить' }));
        await waitFor(() => expect(save).toHaveBeenCalledWith('data:image/jpeg;base64,embedded'));
    });

    it('keeps the English dark editor open on processing errors and allows retry', async () => {
        const save = vi.fn();

        vi.mocked(cropPhoto).mockRejectedValueOnce(new Error('Canvas unavailable'));
        vi.mocked(cropPhoto).mockResolvedValueOnce('data:image/jpeg;base64,photo');
        renderUi(<PhotoEditor source="blob:photo" onSave={save} onClose={vi.fn()} />, 'en', 'dark');

        const apply = screen.getByRole('button', { name: 'Apply' });

        await waitFor(() => expect(apply).toBeEnabled());
        fireEvent.click(screen.getByRole('button', { name: 'Flip horizontally' }));
        expect(screen.getByRole('button', { name: 'Flip horizontally' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(apply);
        expect(await screen.findByText('Unable to process this photo')).toBeVisible();
        expect(save).not.toHaveBeenCalled();
        fireEvent.click(apply);
        await waitFor(() => expect(save).toHaveBeenCalledWith('data:image/jpeg;base64,photo'));
        expect(cropPhoto).toHaveBeenLastCalledWith(
            'blob:photo',
            { x: X_0, y: Y_0, width: WIDTH_512, height: HEIGHT_512 },
            TO_HAVE_BEEN_LAST_CALLED_WITH_0,
            true,
            false,
        );
    });

    it('announces saving and locks duplicate actions until the crop is ready', async () => {
        let complete: (value: string) => void = () => {};

        vi.mocked(cropPhoto).mockReturnValue(
            new Promise((resolve) => {
                complete = resolve;
            }),
        );

        const save = vi.fn();

        renderUi(<PhotoEditor source="blob:photo" onSave={save} onClose={vi.fn()} />);

        const apply = screen.getByRole('button', { name: 'Применить' });

        await waitFor(() => expect(apply).toBeEnabled());
        fireEvent.click(apply);
        expect(screen.getByRole('status', { name: 'Подготавливаем фотографию…' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Отмена' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Повернуть на 90°' })).toBeDisabled();
        expect(apply).toBeDisabled();
        await act(async () => complete('data:image/jpeg;base64,photo'));
        expect(save).toHaveBeenCalledOnce();
    });
});
