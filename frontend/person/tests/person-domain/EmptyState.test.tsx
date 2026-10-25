import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Button } from '@gravity-ui/uikit';
import { EmptyState } from '@persons/person-domain/EmptyState';
import { FeedContent } from '@persons/person-domain/FeedContent';
import { renderUi } from '@test/render';

afterEach(cleanup);

it.each([
    ['ru', 'light', 'Артём ищет людей с лупой в пустой картотеке'],
    ['en', 'dark', 'Artem searches an empty card catalogue with a magnifying glass'],
] as const)('keeps the illustration, localized alternative and action in %s/%s', (locale, theme, alt) => {
    const reset = vi.fn();
    renderUi(
        <EmptyState
            illustration="search"
            title="Search"
            description="Try another query"
            action={<Button onClick={reset}>{'Reset'}</Button>}
            compact
        />,
        locale,
        theme,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Try another query');
    expect(screen.getByAltText(alt)).toHaveAttribute('src', '/media/empty-search-artem-v1.webp');
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(reset).toHaveBeenCalledOnce();
});

it.each(['sessions', 'restrictions', 'publications', 'moderation', 'settings'] as const)(
    'gives the %s empty state its own accessible illustration',
    (illustration) => {
        renderUi(<EmptyState illustration={illustration} title="Empty" />);
        expect(screen.getByRole('heading', { name: 'Empty' })).toBeVisible();
        expect(screen.getByRole('img')).toHaveAttribute('alt', expect.stringMatching(/\S/));
    },
);

it('does not mistake loading or failure for an empty collection and clears the illustration when data arrives', () => {
    const retry = vi.fn();
    const props = {
        empty: true,
        emptyTitle: 'Empty',
        emptyDescription: 'No entries yet',
        illustration: 'publications' as const,
        onRetry: retry,
        children: <Button>{'Entry'}</Button>,
    };
    const view = renderUi(<FeedContent {...props} loading />);
    expect(screen.queryByText('No entries yet')).not.toBeInTheDocument();
    view.rerender(<FeedContent {...props} loading={false} error="UNAVAILABLE" />);
    expect(screen.queryByText('No entries yet')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Попробовать ещё раз' }));
    expect(retry).toHaveBeenCalledOnce();
    view.rerender(<FeedContent {...props} loading={false} />);
    expect(screen.getByText('No entries yet')).toBeVisible();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/media/empty-publications-krel-v1.webp');
    view.rerender(<FeedContent {...props} loading={false} empty={false} />);
    expect(screen.queryByText('No entries yet')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entry' })).toBeVisible();
});
