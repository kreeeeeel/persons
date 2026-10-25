import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { CredentialsForm } from '@/modules/id/components/CredentialsForm/CredentialsForm';

afterEach(cleanup);

describe('sign-in form', () => {
    it('exposes password recovery as a text link and submits the entered credentials', () => {
        const submit = vi.fn();
        const forgot = vi.fn();

        renderUi(
            <CredentialsForm
                pending={false}
                onSubmit={submit}
                onForgot={forgot}
                onRegister={vi.fn()}
                onBack={vi.fn()}
            />,
        );

        const link = screen.getByRole('link', { name: 'Забыли пароль?' });

        expect(link).toHaveAttribute('href', '/ru/recovery');
        expect(screen.queryByRole('button', { name: 'Забыли пароль?' })).not.toBeInTheDocument();
        fireEvent.click(link);
        expect(forgot).toHaveBeenCalledOnce();

        fireEvent.change(screen.getByLabelText('Электронная почта'), {
            target: { value: 'resident@example.test' },
        });
        fireEvent.change(screen.getByLabelText('Пароль'), {
            target: { value: 'Test-password-123' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
        expect(submit).toHaveBeenCalledWith('resident@example.test', 'Test-password-123');
    });

    it('localizes the recovery link and blocks navigation while submission is pending', () => {
        const forgot = vi.fn();

        renderUi(
            <CredentialsForm pending onSubmit={vi.fn()} onForgot={forgot} onRegister={vi.fn()} onBack={vi.fn()} />,
            'en',
            'dark',
        );

        const link = screen.getByRole('link', { name: 'Forgot password?' });

        expect(link).toHaveAttribute('href', '/en/recovery');
        expect(link).toHaveAttribute('aria-disabled', 'true');
        expect(link).toHaveAttribute('tabindex', '-1');
        fireEvent.click(link);
        expect(forgot).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Loading…' })).toBeDisabled();
        expect(screen.getByLabelText('Email address')).toBeDisabled();
    });
});
