"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountActionResult } from "@persons/person-domain/account/model/AccountActionResult";

export function useAccountResource<T>(
    load: () => Promise<AccountActionResult<T>>,
) {
    const [revision, setRevision] = useState(0);
    const [state, setState] = useState<{ data?: T; error?: string }>();

    useEffect(() => {
        let cancelled = false;
        load()
            .then((result) => {
                if (!cancelled) {
                    setState((previous) =>
                        result.ok
                            ? { data: result.data }
                            : { data: previous?.data, error: result.code },
                    );
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setState((previous) => ({
                        ...previous,
                        error: "UNAVAILABLE",
                    }));
                }
            });

        return () => {
            cancelled = true;
        };
    }, [load, revision]);

    const reload = useCallback(() => setRevision((value) => value + 1), []);

    return { ...state, loading: !state, reload };
}
