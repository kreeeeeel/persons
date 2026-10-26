import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { renderUi } from '@test/render';
import { ProfileDescription } from '@/modules/profile/components/ProfileDescription/ProfileDescription';

afterEach(cleanup);

it('allows expanding and collapsing a long description', () => {
    renderUi(<ProfileDescription description={'Описание человека. '.repeat(30)} />);
    const button = screen.getByRole('button', { name: 'Читать полностью' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Свернуть описание' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
});

it('keeps short descriptions complete without an expander', () => {
    renderUi(<ProfileDescription description="Короткое описание" />);
    expect(screen.getByText('Короткое описание')).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
