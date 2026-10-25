export const METRIKA_COUNTER_ID = 113741427;
export const METRIKA_SCRIPT_URL = 'https://mc.yandex.ru/metrika/tag.js';

const CAMPAIGN_PARAMETERS = new Set([
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'yclid',
    'ysclid',
    'gclid',
]);

type MetrikaCommand = [counterId: number, method: 'init' | 'hit' | 'destruct', ...options: unknown[]];

type MetrikaFunction = ((...args: MetrikaCommand) => void) & {
    a?: MetrikaCommand[];
    l?: number;
};

declare global {
    interface Window {
        ym?: MetrikaFunction;
    }
}

export function isMetrikaLocation(publicUrl: string, currentUrl: string) {
    const configured = new URL(publicUrl);
    const current = new URL(currentUrl);

    return (
        configured.origin === current.origin &&
        current.protocol === 'https:' &&
        current.hostname !== 'localhost' &&
        !current.hostname.endsWith('.localhost') &&
        !/^[\d.]+$/.test(current.hostname) &&
        !current.hostname.includes(':')
    );
}

export function sanitizeMetrikaUrl(value: string) {
    if (!value) {
        return '';
    }

    let url: URL;

    try {
        url = new URL(value);
    } catch {
        return '';
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return '';
    }

    url.username = '';
    url.password = '';
    url.hash = '';
    Array.from(url.searchParams.keys()).forEach((key) => {
        if (!CAMPAIGN_PARAMETERS.has(key)) {
            url.searchParams.delete(key);
        }
    });

    return url.href;
}

export function prepareMetrika() {
    if (window.ym) {
        return;
    }

    const ym: MetrikaFunction = (...args) => {
        (ym.a ??= []).push(args);
    };

    ym.l = Date.now();
    window.ym = ym;
}
