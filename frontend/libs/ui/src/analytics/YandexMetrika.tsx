'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import type { YandexMetrikaProps } from '@persons/ui/analytics/YandexMetrika.types';
import {
    isMetrikaLocation,
    METRIKA_COUNTER_ID,
    METRIKA_SCRIPT_URL,
    prepareMetrika,
    sanitizeMetrikaUrl,
} from '@persons/ui/analytics/metrika';
import { readCookiePreference, subscribeCookiePreference } from '@persons/ui/privacy/cookiePreferences';

const serverPreference = () => undefined;

export function YandexMetrika({ enabled, publicUrl }: YandexMetrikaProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const preference = useSyncExternalStore(subscribeCookiePreference, readCookiePreference, serverPreference);
    const [ready, setReady] = useState(false);
    const initialized = useRef(false);
    const previousUrl = useRef<string | undefined>(undefined);
    const active = enabled && preference === 'accepted' && isMetrikaLocation(publicUrl, window.location.href);

    useEffect(() => {
        if (active) {
            prepareMetrika();
        }
    }, [active]);

    useEffect(() => {
        if (!active || !ready) {
            if (initialized.current) {
                window.ym?.(METRIKA_COUNTER_ID, 'destruct');
                initialized.current = false;
                previousUrl.current = undefined;
            }

            return;
        }

        if (!initialized.current) {
            window.ym?.(METRIKA_COUNTER_ID, 'init', {
                defer: true,
                accurateTrackBounce: true,
                webvisor: false,
                clickmap: false,
                trackLinks: false,
                trackHash: false,
                sendTitle: false,
                disableYtm: true,
            });
            initialized.current = true;
        }

        const url = sanitizeMetrikaUrl(window.location.href);

        if (url !== previousUrl.current) {
            window.ym?.(METRIKA_COUNTER_ID, 'hit', url, {
                referer: previousUrl.current ?? sanitizeMetrikaUrl(document.referrer),
                title: 'Те ещё люди',
            });
            previousUrl.current = url;
        }
    }, [active, ready, pathname, searchParams]);

    useEffect(
        () => () => {
            if (initialized.current) {
                window.ym?.(METRIKA_COUNTER_ID, 'destruct');
                initialized.current = false;
                previousUrl.current = undefined;
            }
        },
        [],
    );

    if (!active) {
        return null;
    }

    return (
        <Script
            id="persons-yandex-metrika"
            src={METRIKA_SCRIPT_URL}
            strategy="afterInteractive"
            onReady={() => setReady(true)}
            onError={() => console.warn('Yandex Metrika is temporarily unavailable')}
        />
    );
}
