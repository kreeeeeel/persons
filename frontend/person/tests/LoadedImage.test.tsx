import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LoadedImage } from '@persons/ui';
import { renderUi } from '@test/render';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

it('loads the actual image without creating a duplicate preload request and resets for another source', () => {
    const preload = vi.spyOn(window, 'Image');
    const view = renderUi(<LoadedImage src="/first.png" alt="Первое" width={160} height={120} loading="lazy" />);
    const image = screen.getByRole('img', { name: 'Первое' });
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveStyle({ objectFit: 'contain' });
    expect(image.parentElement).toHaveAttribute('aria-busy', 'true');
    fireEvent.load(image);
    expect(image.parentElement).toHaveAttribute('aria-busy', 'false');
    expect(preload).not.toHaveBeenCalled();
    view.rerender(<LoadedImage src="/second.png" alt="Второе" width={160} height={120} />);
    const second = screen.getByRole('img', { name: 'Второе' });
    expect(second.parentElement).toHaveAttribute('aria-busy', 'true');
    fireEvent.error(second);
    expect(second.parentElement).toHaveAttribute('aria-busy', 'false');
});
