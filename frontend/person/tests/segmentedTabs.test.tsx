import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SegmentedTabs } from '@persons/ui/SegmentedTabs';
import { renderUi } from '@test/render';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

it('reveals the selected tab horizontally without scrolling the page', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        frames.push(callback);
        return 1;
    });
    const items = [
        { value: 'wall', label: 'Wall' },
        { value: 'integrations', label: 'Integrations' },
    ];
    const { rerender } = renderUi(
        <SegmentedTabs items={items} value="integrations" onUpdate={vi.fn()} label="Profile" />,
    );
    const container = screen.getByRole('tablist').parentElement!;
    Object.defineProperty(container, 'clientWidth', { value: 300 });
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 300, 52));
    vi.spyOn(screen.getByRole('tab', { name: 'Integrations' }), 'getBoundingClientRect').mockReturnValue(
        new DOMRect(500, 0, 120, 44),
    );
    act(() => frames.splice(0).forEach((callback) => callback(0)));
    expect(container.scrollLeft).toBe(324);

    rerender(<SegmentedTabs items={items} value="wall" onUpdate={vi.fn()} label="Profile" />);
    vi.spyOn(screen.getByRole('tab', { name: 'Wall' }), 'getBoundingClientRect').mockReturnValue(
        new DOMRect(-320, 0, 80, 44),
    );
    act(() => frames.splice(0).forEach((callback) => callback(1)));
    expect(container.scrollLeft).toBe(0);
    expect(container.scrollTop).toBe(0);
});
