import { cleanup, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { Box } from '@gravity-ui/uikit';
import { afterEach, expect, it } from 'vitest';
import { useHydrated } from '@/shared/hooks/useHydrated';

function HydrationProbe() {
    return <Box data-ready={useHydrated()} />;
}

afterEach(cleanup);

it('keeps server content noninteractive and enables it after client hydration', () => {
    expect(renderToString(<HydrationProbe />)).toContain('data-ready="false"');
    const { container } = render(<HydrationProbe />);

    expect(container.firstChild).toHaveAttribute('data-ready', 'true');
});
