import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useImageState } from '@persons/ui/useImageState';
import { resolveLocale } from '@persons/i18n/locale';
import countries from '@persons/i18n/Flag/country-codes.json';

const ONLOAD_0 = 0;
const ONERROR_1 = 1;
const TO_BE_GREATER_THAN_OR_EQUAL_249 = 249;

afterEach(() => vi.unstubAllGlobals());

describe('shared frontend libraries', () => {
    it('keeps the media skeleton until loading completes and restarts it for a new URL', () => {
        const images: Array<{ onload?: () => void; onerror?: () => void; src?: string }> = [];

        vi.stubGlobal(
            'Image',
            class {
                constructor() {
                    images.push(this);
                }
            },
        );

        const { result, rerender } = renderHook(({ src }) => useImageState(src), {
            initialProps: { src: '/first.svg' },
        });

        expect(result.current.ready).toBe(false);
        act(() => images[ONLOAD_0].onload?.());
        expect(result.current.ready).toBe(true);
        rerender({ src: '/second.svg' });
        expect(result.current.ready).toBe(false);
        act(() => images[ONERROR_1].onerror?.());
        expect(result.current.failed).toBe(true);
        expect(result.current.ready).toBe(true);
    });

    it('resolves unsupported locales and exports unique country assets', () => {
        expect(resolveLocale('en')).toBe('en');
        expect(resolveLocale('unknown')).toBe('ru');
        expect(countries).toEqual(expect.arrayContaining(['ru', 'us', 'gb', 'cn', 'de']));
        expect(countries.length).toBeGreaterThanOrEqual(TO_BE_GREATER_THAN_OR_EQUAL_249);
        expect(new Set(countries).size).toBe(countries.length);
    });
});
