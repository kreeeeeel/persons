import { cleanup, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MutationFeedback } from '@persons/person-domain/MutationFeedback';
import { renderUi } from '@test/render';

afterEach(cleanup);

it('does not add a generic saved banner to a successful interaction', () => {
    const { container } = renderUi(<MutationFeedback published />);
    expect(screen.queryByText('Изменения сохранены.')).not.toBeInTheDocument();
    expect(container.querySelector('[role="alert"]')).toBeNull();
});

it('keeps useful errors and a quiet moderation status visible', () => {
    renderUi(<MutationFeedback notice error="UNAVAILABLE" />);
    expect(screen.getByRole('status')).toHaveTextContent(/модерац/);
    expect(screen.getByText('Не удалось связаться с сервисом. Попробуйте ещё раз.')).toBeVisible();
});
