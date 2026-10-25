import { cleanup, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ScreenSkeleton } from '@/shared/ui/ScreenSkeleton/ScreenSkeleton';
import { renderUi } from '@test/render';

afterEach(cleanup);

it.each([
    ['ru', 'light'],
    ['en', 'dark'],
    ['ru', 'dark'],
    ['en', 'light'],
] as const)('announces loading without interactive or fabricated content in %s/%s', (locale, theme) => {
    renderUi(<ScreenSkeleton />, locale, theme);

    expect(screen.getByRole('status', { name: locale === 'ru' ? 'Загрузка…' : 'Loading…' })).toHaveAttribute(
        'aria-busy',
        'true',
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
