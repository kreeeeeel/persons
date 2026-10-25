import { cleanup, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { renderUi } from '@test/render';
import { ModerationDetails } from '@/modules/person/components/ModerationDetails/ModerationDetails';

afterEach(cleanup);

it('shows translated media kinds and readable tagged names instead of identifiers', () => {
    renderUi(
        <ModerationDetails
            payload={JSON.stringify({
                kind: 'PHOTO',
                caption: 'Наша компания',
                taggedPersonIds: ['private-internal-id'],
                taggedNames: ['Вадим'],
            })}
        />,
    );
    expect(screen.getByText('Фотография', { exact: true })).toBeVisible();
    expect(screen.getByText('Вадим', { exact: true })).toBeVisible();
    expect(screen.queryByText('private-internal-id')).not.toBeInTheDocument();
});
