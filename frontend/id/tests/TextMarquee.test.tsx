import { act, cleanup, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@gravity-ui/uikit';
import { TextMarquee } from '@persons/ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TO_HAVE_LENGTH_2 = 2;
const UTS = 'UTS';
const VIEWPORT_1200 = 1200;
const MOCK_RETURN_0 = 0;
const MOCK_RETURN_240 = 240;
const MOCK_RETURN_44 = 44;
const TO_HAVE_LENGTH_1 = 1;
const TO_HAVE_LENGTH_10 = 10;
const MOCK_RETURN_320 = 320;
const TO_HAVE_LENGTH_4 = 4;

let resize = () => {};

beforeEach(() => {
    vi.stubGlobal(
        'ResizeObserver',
        vi.fn(function (callback: () => void) {
            resize = callback;

            return { observe: vi.fn(), disconnect: vi.fn() };
        }),
    );
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('shared text marquee', () => {
    it('accepts arbitrary words and exposes a single copy to screen readers', () => {
        render(
            <ThemeProvider>
                <TextMarquee items={['Первый текст', 'Второй текст', 'Первый текст']} label="Подписи" />
            </ThemeProvider>,
        );

        const region = screen.getByRole('region', { name: 'Подписи' });
        const list = within(region).getByRole('list');

        expect(
            within(list)
                .getAllByRole('listitem')
                .map((item) => item.textContent),
        ).toEqual(['Первый текст', 'Второй текст', 'Первый текст']);
        expect(within(region).getAllByRole('list', { hidden: true })).toHaveLength(TO_HAVE_LENGTH_2);
    });

    it('updates the words without retaining stale content', () => {
        const { rerender } = render(
            <ThemeProvider>
                <TextMarquee items={['Диплом', 'УТС']} />
            </ThemeProvider>,
        );

        rerender(
            <ThemeProvider>
                <TextMarquee items={['Diploma', UTS, 'Kirill Nemtyrev']} />
            </ThemeProvider>,
        );

        expect(screen.queryByText('Диплом')).not.toBeInTheDocument();
        expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
            'Diploma',
            UTS,
            'Kirill Nemtyrev',
        ]);
    });

    it('fills the ribbon with compact repetitions when the viewport changes', () => {
        const viewport = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(VIEWPORT_1200);

        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
            new DOMRect(MOCK_RETURN_0, MOCK_RETURN_0, MOCK_RETURN_240, MOCK_RETURN_44),
        );
        render(
            <ThemeProvider>
                <TextMarquee items={['Диплом', 'УТС']} label="Подписи" />
            </ThemeProvider>,
        );

        const region = screen.getByRole('region', { name: 'Подписи' });

        expect(within(region).getAllByRole('list')).toHaveLength(TO_HAVE_LENGTH_1);
        expect(within(region).getAllByRole('list', { hidden: true })).toHaveLength(TO_HAVE_LENGTH_10);

        viewport.mockReturnValue(MOCK_RETURN_320);
        act(() => resize());

        expect(within(region).getAllByRole('list', { hidden: true })).toHaveLength(TO_HAVE_LENGTH_4);
        expect(
            within(region)
                .getAllByRole('listitem')
                .map((item) => item.textContent),
        ).toEqual(['Диплом', 'УТС']);
    });

    it('renders no strip for an empty list', () => {
        render(
            <ThemeProvider>
                <TextMarquee items={['', '  ']} label="Подписи" />
            </ThemeProvider>,
        );

        expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });

    it('marks loading content as busy and waits before rendering the list', () => {
        render(
            <ThemeProvider>
                <TextMarquee items={[]} loading label="Подписи" />
            </ThemeProvider>,
        );

        expect(screen.getByRole('region', { name: 'Подписи' })).toHaveAttribute('aria-busy', 'true');
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
});
