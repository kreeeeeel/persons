import { describe, expect, it } from 'vitest';
import { postSignInHref } from '@/modules/id/model/postSignInHref';

describe('postSignInHref', () => {
    it('preserves a local profile destination', () => {
        expect(postSignInHref('ru', '?returnTo=/en/home')).toBe('/en/home');
    });
    it.each(['https://example.test', '//example.test', '/ru/home/../../', '/ru/home?next=evil'])(
        'rejects unsafe destination %s',
        (destination) => {
            expect(postSignInHref('ru', '?returnTo=' + encodeURIComponent(destination))).toBe('/ru/home');
        },
    );
    it('keeps the selected locale', () => {
        expect(postSignInHref('en', '')).toBe('/en/home');
    });
    it('keeps a safe persona tag and rejects additional URL components', () => {
        expect(postSignInHref('ru', '?returnTo=/person/en/vadim')).toBe('/person/en/vadim');
        expect(postSignInHref('ru', '?returnTo=/person/en/vadim/more')).toBe('/ru/home');
        expect(postSignInHref('ru', '?returnTo=/person/ru/evil.test')).toBe('/ru/home');
    });
    it('returns to the configured admin application through a local route', () => {
        expect(postSignInHref('ru', '?returnTo=/admin/en')).toBe('/admin/en');
        expect(postSignInHref('ru', '?returnTo=/admin/en/../')).toBe('/ru/home');
    });
    it('returns to the configured person application through a fixed local handoff', () => {
        expect(postSignInHref('ru', '?returnTo=/person/ru')).toBe('/person/ru');
        expect(postSignInHref('en', '?returnTo=/person/en')).toBe('/person/en');
        expect(postSignInHref('ru', '?returnTo=/person/ru/../')).toBe('/ru/home');
        expect(postSignInHref('ru', '?returnTo=/person/ru?next=https://example.test')).toBe('/ru/home');
    });
});
