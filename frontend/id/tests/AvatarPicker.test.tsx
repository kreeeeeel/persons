import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AvatarPicker } from '@persons/photo-editor';
import { inspectPhoto } from '@persons/photo-editor/image';
import type { PhotoIssue } from '@persons/photo-editor/image';
import { renderUi } from '@test/render';

const TO_HAVE_LENGTH_1 = 1;

vi.mock('@persons/photo-editor/image', () => ({
    inspectPhoto: vi.fn(),
    isPhotoSizeAllowed: vi.fn(),
}));

afterEach(() => {
    cleanup();
    vi.resetAllMocks();
});

describe('avatar file control', () => {
    it('offers one icon button without separate upload and edit text buttons', () => {
        renderUi(<AvatarPicker name="Анна Иванова" onChange={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'Выбрать фотографию' })).toBeVisible();
        expect(screen.getAllByRole('button')).toHaveLength(TO_HAVE_LENGTH_1);
        expect(screen.queryByText('Выбрать фотографию')).not.toBeInTheDocument();
        expect(screen.queryByText('Редактировать фото')).not.toBeInTheDocument();
    });

    it('shows loading and a localized resolution error while preserving the existing avatar', async () => {
        let finish: (issue: PhotoIssue) => void = () => {};

        vi.mocked(inspectPhoto).mockReturnValue(
            new Promise((resolve) => {
                finish = resolve;
            }),
        );

        const change = vi.fn();

        renderUi(<AvatarPicker name="Анна Иванова" onChange={change} />);
        fireEvent.change(screen.getByLabelText('Выбрать фотографию', { selector: 'input' }), {
            target: { files: [new File(['photo'], 'tiny.png', { type: 'image/png' })] },
        });
        expect(screen.getByRole('button', { name: 'Выбрать фотографию' })).toBeDisabled();
        await act(async () => finish('invalidDimensions'));
        expect(await screen.findByText(/Выберите фото от 256×256/)).toBeVisible();
        expect(change).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Выбрать фотографию' })).toBeEnabled();
    });
});
