'use client';

import { useEffect } from 'react';
import { useLoadingFailure } from '@persons/ui/loading/useLoadingFailure';

const RETRY_INTERVAL_MILLIS = 15000;
const NOTIFICATION_DELAY_MILLIS = 8000;

export function useRouteRetry(retry: () => void) {
    const report = useLoadingFailure();

    useEffect(() => {
        const notification = setTimeout(() => report(true), NOTIFICATION_DELAY_MILLIS);
        const timer = setInterval(retry, RETRY_INTERVAL_MILLIS);

        return () => {
            clearTimeout(notification);
            clearInterval(timer);
        };
    }, [retry, report]);
}
