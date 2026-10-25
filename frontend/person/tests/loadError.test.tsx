import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LoadError } from '@persons/ui/loading/LoadError';
import { LoadErrorContext } from '@persons/ui/loading/LoadErrorContext';
import { renderUi } from '@test/render';

afterEach(cleanup);

it.each(['page', 'dialog'] as const)('shows the %s illustration and retries the failed request', (scope) => {
    const retry = vi.fn();
    renderUi(
        <LoadErrorContext value={scope}>
            <LoadError
                title="Не удалось загрузить"
                description="Попробуйте ещё раз"
                retryLabel="Повторить"
                onRetry={retry}
            />
        </LoadErrorContext>,
    );
    const image = screen.getByRole('alert').querySelector('img');
    expect(image).toHaveAttribute(
        'src',
        `/media/${scope === 'page' ? 'error-page-stepa-slava' : 'error-modal-nikita'}-v1.webp`,
    );
    expect(screen.getByRole('heading', { name: 'Не удалось загрузить' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(retry).toHaveBeenCalledOnce();
});
