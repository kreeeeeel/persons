import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { InfiniteFeedLoader } from '@persons/person-domain/InfiniteFeedLoader';
import { renderUi } from '@test/render';

afterEach(cleanup);

it.each([
    ['ru', 'Загрузка…', 'Попробовать ещё раз'],
    ['en', 'Loading…', 'Try again'],
] as const)('translates loading and retry in %s', (locale, loading, retry) => {
    const change = vi.fn();
    const view = renderUi(<InfiniteFeedLoader hasMore loadingMore loadMore={change} />, locale);
    expect(screen.getByRole('status', { name: loading })).toBeVisible();
    view.unmount();
    renderUi(<InfiniteFeedLoader hasMore loadingMore={false} moreError="UNAVAILABLE" loadMore={change} />, locale);
    fireEvent.click(screen.getByRole('button', { name: retry }));
    expect(change).toHaveBeenCalledOnce();
});
