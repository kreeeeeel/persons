'use client';

import { useEffect, type ReactNode } from 'react';
import { useLoadingFailure } from '@persons/ui/loading/useLoadingFailure';

const UNAVAILABLE = 'UNAVAILABLE';

export function RequestError({ code, children }: { readonly code?: string | boolean; readonly children?: ReactNode }) {
    const report = useLoadingFailure();
    const unavailable = code === UNAVAILABLE || code === 'error' || code === true;

    useEffect(() => report(unavailable), [unavailable, report]);

    return code && !unavailable ? children : null;
}
