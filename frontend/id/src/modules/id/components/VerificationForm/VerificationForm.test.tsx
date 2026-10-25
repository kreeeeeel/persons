import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { VerificationForm } from '@/modules/id/components/VerificationForm/VerificationForm';

const RESEND_AT_60000 = 60000;
const RESEND_AT_0 = 0;

afterEach(cleanup);

describe('email verification', () => {
    it('disables confirmation until all six digits are present', () => {
        const submit = vi.fn();

        renderUi(
            <VerificationForm
                pending={false}
                resendAt={new Date(Date.now() + RESEND_AT_60000).toISOString()}
                onSubmit={submit}
                onResend={vi.fn()}
                onBack={vi.fn()}
            />,
        );

        const button = screen.getByRole('button', { name: 'Подтвердить почту' });

        expect(button).toBeDisabled();

        const fields = screen.getAllByRole('textbox');

        fields.forEach((field, index) => fireEvent.change(field, { target: { value: String(index) } }));
        expect(button).toBeEnabled();
        fireEvent.click(button);
        expect(submit).toHaveBeenCalledWith('012345');
    });

    it('allows resending after the deadline and exposes a pending spinner', () => {
        const resend = vi.fn();
        const { unmount } = renderUi(
            <VerificationForm
                pending={false}
                resendAt={new Date(RESEND_AT_0).toISOString()}
                onSubmit={vi.fn()}
                onResend={resend}
                onBack={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Отправить код ещё раз' }));
        expect(resend).toHaveBeenCalledOnce();
        unmount();
        renderUi(
            <VerificationForm
                pending
                resendAt={new Date(RESEND_AT_0).toISOString()}
                onSubmit={vi.fn()}
                onResend={vi.fn()}
                onBack={vi.fn()}
            />,
            'en',
            'dark',
        );
        expect(screen.getByRole('button', { name: 'Loading…' })).toBeDisabled();
        expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
    });
});
