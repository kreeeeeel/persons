import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { CredentialsForm } from '@/modules/id/components/CredentialsForm/CredentialsForm';
import { renderUi } from '@test/render';

it('starts with an empty password and supports the browser password manager', async () => {
    const onSubmit = vi.fn();

    renderUi(
        <CredentialsForm
            pending={false}
            onSubmit={onSubmit}
            onForgot={vi.fn()}
            onRegister={vi.fn()}
            onBack={vi.fn()}
        />,
    );

    const password = screen.getByLabelText('Пароль', { exact: true });

    expect(password).toHaveValue('');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(password.closest('form')).toHaveAttribute('autocomplete', 'off');
    await userEvent.type(screen.getByLabelText('Электронная почта'), 'anna@example.test');
    await userEvent.type(password, 'entered-password');
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
    expect(onSubmit).toHaveBeenCalledWith('anna@example.test', 'entered-password');
});
