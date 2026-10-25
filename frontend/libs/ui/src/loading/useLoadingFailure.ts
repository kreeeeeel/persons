'use client';

import { useCallback, useContext, useEffect, useId } from 'react';
import { LoadingFailureContext } from '@persons/ui/loading/LoadingFailureContext';

export function useLoadingFailure() {
    const source = useId();
    const update = useContext(LoadingFailureContext);
    const report = useCallback((failed: boolean) => update(source, failed), [source, update]);

    useEffect(() => () => report(false), [report]);

    return report;
}
