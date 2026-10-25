import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Button } from '@gravity-ui/uikit';
import { AvatarDialog } from '@persons/person-domain/account/components/AvatarDialog/AvatarDialog';
import { renderUi } from '@test/render';

vi.mock('@persons/photo-editor', () => ({
    AvatarPicker: ({ onChange, inlineEditor }: { onChange: (image: string) => void; inlineEditor: boolean }) => (
        <Button onClick={() => onChange('data:image/jpeg;base64,photo')}>
            {inlineEditor ? 'Обрезать в настройках' : 'Открыть редактор'}
        </Button>
    ),
}));
afterEach(cleanup);

it('saves a cropped avatar inside settings and clears the submitted draft', async () => {
    const save = vi.fn().mockResolvedValue({ ok: true });
    const saved = vi.fn();
    renderUi(<AvatarDialog embedded name="Кирилл" saveAvatar={save} onSaved={saved} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
        screen
            .getAllByRole('button')
            .slice(-2)
            .map((button) => button.textContent),
    ).toEqual(['Сохранить', 'Отмена']);
    fireEvent.click(screen.getByRole('button', { name: 'Обрезать в настройках' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(saved).toHaveBeenCalledWith('data:image/jpeg;base64,photo'));
    expect(save).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent('Фотография сохранена');
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
});

it('cancels an avatar draft without closing settings', () => {
    const close = vi.fn();
    const save = vi.fn();
    renderUi(<AvatarDialog embedded name="Кирилл" saveAvatar={save} onSaved={vi.fn()} onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: 'Обрезать в настройках' }));
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
    expect(close).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
});
