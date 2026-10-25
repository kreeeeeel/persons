// @vitest-environment-options {"url":"https://kreeeeeel.ru/ru"}
import { StrictMode } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { YandexMetrika } from '@persons/ui/analytics/YandexMetrika';
import { isMetrikaLocation, METRIKA_COUNTER_ID, sanitizeMetrikaUrl } from '@persons/ui/analytics/metrika';
import { COOKIE_PREFERENCE_CHANGED } from '@persons/ui/privacy/cookiePreferences';

const script = vi.hoisted(() => ({
    render: vi.fn(),
    onReady: undefined as (() => void) | undefined,
    onError: undefined as (() => void) | undefined,
}));
const route = vi.hoisted(() => ({ pathname: '/ru', search: new URLSearchParams() }));

vi.mock('next/navigation', () => ({
    usePathname: () => route.pathname,
    useSearchParams: () => route.search,
}));
vi.mock('next/script', () => ({
    default: (props: { onReady: () => void; onError: () => void }) => {
        script.render(props);
        script.onReady = props.onReady;
        script.onError = props.onError;

        return null;
    },
}));

function choose(choice: 'accepted' | 'rejected') {
    act(() => {
        document.cookie = `PERSONS_OPTIONAL_COOKIES=${choice}; Path=/`;
        window.dispatchEvent(new Event(COOKIE_PREFERENCE_CHANGED));
    });
}

function loadScript() {
    const ym = vi.fn();
    window.ym = ym;
    act(() => script.onReady?.());

    return ym;
}

beforeEach(() => {
    window.history.replaceState(null, '', '/ru');
    route.pathname = '/ru';
    route.search = new URLSearchParams();
    script.render.mockClear();
    script.onReady = undefined;
    script.onError = undefined;
});

afterEach(() => {
    cleanup();
    document.cookie = 'PERSONS_OPTIONAL_COOKIES=; Path=/; Max-Age=0';
    delete window.ym;
    vi.restoreAllMocks();
});

describe('Metrika page views', () => {
    it.each([undefined, 'rejected'] as const)('does not load or initialize without consent: %s', (choice) => {
        if (choice) {
            choose(choice);
        }

        render(<YandexMetrika enabled publicUrl="https://kreeeeeel.ru" />);

        expect(script.render).not.toHaveBeenCalled();
        expect(window.ym).toBeUndefined();
    });

    it('does not load when the application profile disables analytics', () => {
        choose('accepted');
        render(<YandexMetrika enabled={false} publicUrl="https://kreeeeeel.ru" />);

        expect(script.render).not.toHaveBeenCalled();
        expect(window.ym).toBeUndefined();
    });

    it('does not load outside the configured production origin', () => {
        choose('accepted');
        render(<YandexMetrika enabled publicUrl="https://cms.kreeeeeel.ru" />);

        expect(script.render).not.toHaveBeenCalled();
    });

    it('starts after consent and script readiness with sanitized URLs and private features disabled', () => {
        window.history.replaceState(null, '', '/ru?token=secret&utm_source=yandex#private');
        vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://example.test/?email=private&utm_source=link');
        render(<YandexMetrika enabled publicUrl="https://kreeeeeel.ru" />);
        choose('accepted');

        expect(script.render).toHaveBeenCalledWith(
            expect.objectContaining({
                src: 'https://mc.yandex.ru/metrika/tag.js',
                strategy: 'afterInteractive',
            }),
        );
        expect(window.ym?.a).toBeUndefined();

        const ym = loadScript();

        expect(ym).toHaveBeenCalledWith(
            METRIKA_COUNTER_ID,
            'init',
            expect.objectContaining({
                defer: true,
                webvisor: false,
                clickmap: false,
                trackLinks: false,
                sendTitle: false,
                disableYtm: true,
            }),
        );
        expect(ym).toHaveBeenCalledWith(METRIKA_COUNTER_ID, 'hit', 'https://kreeeeeel.ru/ru?utm_source=yandex', {
            referer: 'https://example.test/?utm_source=link',
            title: 'Те ещё люди',
        });
        expect(ym).toHaveBeenCalledTimes(2);
    });

    it('tracks client navigation once and retains the previous page as referrer', () => {
        choose('accepted');
        const view = render(<YandexMetrika enabled publicUrl="https://kreeeeeel.ru" />);
        const ym = loadScript();

        window.history.replaceState(null, '', '/en/people?search=private');
        route.pathname = '/en/people';
        route.search = new URLSearchParams('search=private');
        view.rerender(<YandexMetrika enabled publicUrl="https://kreeeeeel.ru" />);

        expect(ym).toHaveBeenLastCalledWith(METRIKA_COUNTER_ID, 'hit', 'https://kreeeeeel.ru/en/people', {
            referer: 'https://kreeeeeel.ru/ru',
            title: 'Те ещё люди',
        });

        window.history.replaceState(null, '', '/en/people?search=other-private&code=secret');
        route.search = new URLSearchParams('search=other-private&code=secret');
        view.rerender(<YandexMetrika enabled publicUrl="https://kreeeeeel.ru" />);
        act(() => script.onReady?.());

        expect(ym.mock.calls.filter((call) => call[1] === 'init')).toHaveLength(1);
        expect(ym.mock.calls.filter((call) => call[1] === 'hit')).toHaveLength(2);
    });

    it('stops on refusal, ignores navigation, and restarts after renewed consent', () => {
        choose('accepted');
        const view = render(<YandexMetrika enabled publicUrl="https://kreeeeeel.ru" />);
        const ym = loadScript();
        choose('rejected');

        expect(ym).toHaveBeenLastCalledWith(METRIKA_COUNTER_ID, 'destruct');
        window.history.replaceState(null, '', '/en');
        route.pathname = '/en';
        view.rerender(<YandexMetrika enabled publicUrl="https://kreeeeeel.ru" />);
        expect(ym).toHaveBeenCalledTimes(3);

        choose('accepted');
        expect(ym.mock.calls.filter((call) => call[1] === 'init')).toHaveLength(2);
        expect(ym).toHaveBeenLastCalledWith(METRIKA_COUNTER_ID, 'hit', 'https://kreeeeeel.ru/en', expect.any(Object));
    });

    it('does not initialize when consent is withdrawn while the script is loading', () => {
        choose('accepted');
        render(<YandexMetrika enabled publicUrl="https://kreeeeeel.ru" />);
        choose('rejected');
        const ym = loadScript();

        expect(ym).not.toHaveBeenCalled();
    });

    it('rechecks consent when returning from another subdomain', () => {
        choose('accepted');
        render(<YandexMetrika enabled publicUrl="https://kreeeeeel.ru" />);
        const ym = loadScript();
        document.cookie = 'PERSONS_OPTIONAL_COOKIES=rejected; Path=/';
        act(() => window.dispatchEvent(new Event('focus')));

        expect(ym).toHaveBeenLastCalledWith(METRIKA_COUNTER_ID, 'destruct');
    });

    it('avoids duplicate initial views in StrictMode and destroys the counter on unmount', () => {
        choose('accepted');
        const view = render(
            <StrictMode>
                <YandexMetrika enabled publicUrl="https://kreeeeeel.ru" />
            </StrictMode>,
        );
        const ym = loadScript();
        expect(ym.mock.calls.filter((call) => call[1] === 'hit')).toHaveLength(1);

        view.unmount();
        expect(ym).toHaveBeenLastCalledWith(METRIKA_COUNTER_ID, 'destruct');
    });

    it('renders on the server without loading analytics or accessing browser consent', () => {
        choose('accepted');

        expect(renderToString(<YandexMetrika enabled publicUrl="https://kreeeeeel.ru" />)).toBe('');
        expect(script.render).not.toHaveBeenCalled();
    });

    it('handles a blocked analytics script without initializing a counter', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        choose('accepted');
        render(<YandexMetrika enabled publicUrl="https://kreeeeeel.ru" />);
        act(() => script.onError?.());

        expect(warn).toHaveBeenCalledWith('Yandex Metrika is temporarily unavailable');
        expect(window.ym?.a).toBeUndefined();
    });
});

describe('Metrika URL filtering', () => {
    it.each(['kreeeeeel.ru', 'id.kreeeeeel.ru', 'cms.kreeeeeel.ru'])(
        'allows the configured HTTPS application: %s',
        (host) => {
            expect(isMetrikaLocation(`https://${host}`, `https://${host}/ru`)).toBe(true);
        },
    );

    it.each([
        'http://localhost:3002',
        'https://localhost',
        'https://preview.localhost',
        'https://127.0.0.1',
        'https://[::1]',
    ])('rejects local production builds: %s', (url) => {
        expect(isMetrikaLocation(url, url)).toBe(false);
    });

    it('removes credentials, fragments, form data and nested return URLs while keeping campaign attribution', () => {
        expect(
            sanitizeMetrikaUrl(
                'https://user:password@id.kreeeeeel.ru/ru?email=private&code=secret&returnTo=%2F%3Ftoken%3Dsecret&utm_source=yandex&utm_campaign=launch&yclid=123#token',
            ),
        ).toBe('https://id.kreeeeeel.ru/ru?utm_source=yandex&utm_campaign=launch&yclid=123');
    });

    it.each(['', 'invalid', 'javascript:alert(1)', 'mailto:private@example.test'])(
        'discards invalid referrers: %s',
        (url) => {
            expect(sanitizeMetrikaUrl(url)).toBe('');
        },
    );
});
