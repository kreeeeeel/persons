import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { AvatarDialog } from '@/modules/account/components/AvatarDialog/AvatarDialog';
import { changeAvatar } from '@/modules/account/actions/changeAvatar';
import { Button } from '@gravity-ui/uikit';

const CHOOSE_PHOTO = 'Выбрать фотографию';

vi.mock('@/modules/account/actions/changeAvatar', () => ({ changeAvatar: vi.fn() }));
vi.mock('@persons/photo-editor', () => ({
    AvatarPicker: ({ onChange, disabled }: { onChange: (image: string) => void; disabled: boolean }) => (
        <Button disabled={disabled} onClick={() => onChange('data:image/jpeg;base64,cGhvdG8=')}>
            {CHOOSE_PHOTO}
        </Button>
    ),
}));

afterEach(() => {
    cleanup();
    vi.resetAllMocks();
});

it('requires an edited photo, prevents duplicate submissions and reports success', async () => {
    let finish: (result: { ok: true; data: undefined }) => void = () => {};
    vi.mocked(changeAvatar).mockReturnValue(
        new Promise((resolve) => {
            finish = resolve;
        }),
    );
    const saved = vi.fn();
    renderUi(<AvatarDialog name="Крел" onClose={vi.fn()} onSaved={saved} />);
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать фотографию' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(screen.getByRole('button', { name: 'Выбрать фотографию' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('button', { name: 'Загрузка…' }).closest('form')!);
    expect(changeAvatar).toHaveBeenCalledTimes(1);
    finish({ ok: true, data: undefined });
    await waitFor(() => expect(saved).toHaveBeenCalledWith('data:image/jpeg;base64,cGhvdG8='));
});

it('keeps the photo available for retry after a failed upload', async () => {
    vi.mocked(changeAvatar).mockResolvedValue({ ok: false, code: 'INVALID_AVATAR' });
    const saved = vi.fn();
    renderUi(<AvatarDialog name="Крел" onClose={vi.fn()} onSaved={saved} />);
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать фотографию' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить фотографию');
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeEnabled();
    expect(saved).not.toHaveBeenCalled();
});
