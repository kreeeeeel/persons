import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { DetailsForm } from '@/modules/id/components/DetailsForm/DetailsForm';

vi.mock('next/navigation', () => ({ usePathname: () => null }));
afterEach(cleanup);

const details = { firstName: 'Анна', lastName: 'Иванова', email: 'anna@example.test', locale: 'ru' as const };

it('limits all three name fields to ten characters and retains the email limit', () => {
    renderUi(<DetailsForm value={details} onChange={vi.fn()} pending={false} onSubmit={vi.fn()} onBack={vi.fn()} />);
    ['Имя', 'Фамилия', 'Отчество'].forEach((name) => {
        expect(screen.getByLabelText(name)).toHaveAttribute('maxlength', '10');
    });
    expect(screen.getByLabelText('Электронная почта')).toHaveAttribute('maxlength', '254');
});

it('requires explicit acceptance and blocks submitting a form without it', () => {
    const submit = vi.fn();
    const { container } = renderUi(
        <DetailsForm value={details} onChange={vi.fn()} pending={false} onSubmit={submit} onBack={vi.fn()} />,
    );
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Продолжить' })).toBeDisabled();
    fireEvent.submit(container.querySelector('form')!);
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Продолжить' })).toBeEnabled();
    fireEvent.submit(container.querySelector('form')!);
    expect(submit).toHaveBeenCalledOnce();
});

it('links to the terms in the chosen language and disables consent while pending', () => {
    renderUi(
        <DetailsForm value={details} onChange={vi.fn()} pending onSubmit={vi.fn()} onBack={vi.fn()} />,
        'en',
        'dark',
    );
    expect(screen.getByRole('link', { name: 'terms of use' })).toHaveAttribute('href', '/legal/en/terms');
    expect(screen.queryByRole('link', { name: 'privacy policy' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeDisabled();
});
