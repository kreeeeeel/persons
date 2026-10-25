"use client";

import { useCallback, useEffect, useState } from "react";
import { personError } from "@persons/person-domain/api/browser";
import { subscribeAccountProfileChanges } from "@persons/person-domain/account/profileChanges";

export function usePersonData<T>(
    key: string,
    loader: (signal: AbortSignal) => Promise<T>,
    initialData?: T,
    resolveError: (error: unknown) => Promise<string> = personError,
) {
    const [revision, setRevision] = useState(0);
    const [settled, setSettled] = useState<{
        key: string;
        resourceKey: string;
        data?: T;
        error?: string;
    }>();
    const requestKey = `${key}:${revision}`;
    const data = settled?.resourceKey === key ? settled.data : initialData;
    const initial = revision === 0 && initialData !== undefined;
    const refreshing = !initial && settled?.key !== requestKey;
    const refresh = useCallback(
        () => setRevision((current) => current + 1),
        [],
    );
    useEffect(() => subscribeAccountProfileChanges(refresh), [refresh]);

    useEffect(() => {
        if (initial) {
            return;
        }
        const controller = new AbortController();

        loader(controller.signal)
            .then((data) => {
                if (!controller.signal.aborted) {
                    setSettled({ key: requestKey, resourceKey: key, data });
                }
            })
            .catch(async (error: unknown) => {
                const code = await resolveError(error);

                if (!controller.signal.aborted) {
                    setSettled((current) => ({
                        key: requestKey,
                        resourceKey: key,
                        data:
                            current?.resourceKey === key
                                ? current.data
                                : initialData,
                        error: code,
                    }));
                }
            });

        return () => controller.abort();
    }, [initial, initialData, key, loader, requestKey, resolveError]);

    return {
        data,
        error: settled?.key === requestKey ? settled.error : undefined,
        loading: data === undefined && refreshing,
        refreshing,
        refresh,
    };
}
