import { cleanup, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Button } from '@gravity-ui/uikit';
import { ListTable } from '@/shared/ui/ListTable/ListTable';
import { renderUi } from '@test/render';

afterEach(cleanup);

it('shows a contextual illustration for an empty table and keeps it out of loading and populated tables', () => {
    const props = {
        title: 'Moderation',
        emptyTitle: 'All caught up',
        emptyDescription: 'New materials will appear here',
        illustration: 'moderation' as const,
        retry: vi.fn(),
        children: <Button>{'Material'}</Button>,
    };
    const view = renderUi(<ListTable {...props} loading empty />, 'en', 'dark');
    expect(screen.queryByText('All caught up')).not.toBeInTheDocument();
    view.rerender(<ListTable {...props} loading={false} empty />);
    expect(screen.getByRole('heading', { name: 'All caught up' })).toBeVisible();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/media/empty-moderation-slava-v1.webp');
    view.rerender(<ListTable {...props} loading={false} empty={false} />);
    expect(screen.getByRole('button', { name: 'Material' })).toBeVisible();
    expect(screen.queryByText('All caught up')).not.toBeInTheDocument();
});
