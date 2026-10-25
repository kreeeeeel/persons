import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ErrorPage from '@/app/[locale]/error';
import { renderUi } from '@test/render';

afterEach(cleanup);

it.each(['ru', 'en'] as const)('retries the route using the Next.js retry callback in %s', (locale) => {
    const retry = vi.fn();
    renderUi(<ErrorPage retry={retry} />, locale);

    expect(screen.getByRole('alert').querySelector('img')).toHaveAttribute(
        'src',
        '/media/error-page-stepa-slava-v1.webp',
    );
    fireEvent.click(screen.getByRole('button'));
    expect(retry).toHaveBeenCalledOnce();
});
