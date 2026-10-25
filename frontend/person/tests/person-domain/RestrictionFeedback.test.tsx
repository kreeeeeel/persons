import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { RestrictionFeedback } from '@persons/person-domain/RestrictionFeedback';
import { notifyRestriction } from '@persons/person-domain/restrictions/notice';
import { renderUi } from '@test/render';

afterEach(cleanup);

it('shows the police explanation with the expiry date and leaves the response readable', async () => {
    renderUi(<RestrictionFeedback>{null}</RestrictionFeedback>);
    const response = new Response(
        JSON.stringify({
            code: 'ACTION_RESTRICTED',
            scope: 'COMMENTS',
            requestId: 'test',
            restriction: {
                id: 'ban',
                userId: 'user',
                scopes: ['COMMENTS'],
                reason: 'Пауза в комментариях',
                createdAt: '2026-10-01T10:00:00Z',
                expiresAt: '2027-01-05T10:00:00Z',
            },
        }),
        { status: 403 },
    );
    await act(async () => notifyRestriction(response));
    expect(screen.getByRole('dialog')).toHaveTextContent('Пауза в комментариях');
    expect(screen.getByRole('dialog')).toHaveTextContent('2027');
    expect(screen.getByRole('img')).toHaveAttribute('src', '/media/restricted-vadim-v1.webp');
    expect((await response.json()).code).toBe('ACTION_RESTRICTED');
    fireEvent.click(screen.getByRole('button', { name: 'Понятно' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('ignores ordinary forbidden and malformed responses', async () => {
    renderUi(<RestrictionFeedback>{null}</RestrictionFeedback>);
    await act(async () => {
        await notifyRestriction(new Response('{"code":"FORBIDDEN"}', { status: 403 }));
        await notifyRestriction(new Response('unavailable', { status: 403 }));
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
