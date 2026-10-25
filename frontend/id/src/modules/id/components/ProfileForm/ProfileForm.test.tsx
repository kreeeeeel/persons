import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { ProfileForm } from '@/modules/id/components/ProfileForm/ProfileForm';

const VALUE_37 = 37;

afterEach(cleanup);

describe('profile password guidance', () => {
    it('explains long passwords without showing encoding or storage details', () => {
        renderUi(<ProfileForm name="Анна" recovery={false} pending={false} onSubmit={vi.fn()} onBack={vi.fn()} />);
        expect(screen.getByText('От 10 символов.')).toBeVisible();
        expect(screen.queryByText(/UTF-8|байт/)).not.toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Придумайте пароль'), {
            target: { value: 'я'.repeat(VALUE_37) },
        });
        expect(screen.getByText('Пароль слишком длинный. Попробуйте короче.')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Открыть Те ещё люди' })).toBeDisabled();
    });

    it('localizes the guidance and locks avatar selection during submission', () => {
        renderUi(
            <ProfileForm name="Anna" recovery={false} pending onSubmit={vi.fn()} onBack={vi.fn()} />,
            'en',
            'dark',
        );
        expect(screen.getByText('At least 10 characters.')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Choose a photo' })).toBeDisabled();
    });
});
