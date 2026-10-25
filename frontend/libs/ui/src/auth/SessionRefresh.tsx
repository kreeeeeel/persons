'use client';

import { useEffect } from 'react';

const REFRESH_INTERVAL_MILLIS = 30 * 60 * 1000;
const FOCUS_COOLDOWN_MILLIS = 60 * 1000;

export function SessionRefresh() {
    useEffect(() => {
        let lastAttempt = 0;
        let pending: AbortController | undefined;
        function refresh() {
            if (document.visibilityState === 'hidden' || pending || Date.now() - lastAttempt < FOCUS_COOLDOWN_MILLIS) {
                return;
            }
            lastAttempt = Date.now();
            pending = new AbortController();
            void fetch('/api/session/refresh', {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                signal: pending.signal,
            })
                .catch((error: unknown) => {
                    if (!(error instanceof Error && error.name === 'AbortError')) {
                        console.warn('Session renewal is temporarily unavailable');
                    }
                })
                .finally(() => {
                    pending = undefined;
                });
        }
        refresh();
        const interval = setInterval(refresh, REFRESH_INTERVAL_MILLIS);
        document.addEventListener('visibilitychange', refresh);
        window.addEventListener('focus', refresh);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', refresh);
            window.removeEventListener('focus', refresh);
            pending?.abort();
        };
    }, []);
    return null;
}
