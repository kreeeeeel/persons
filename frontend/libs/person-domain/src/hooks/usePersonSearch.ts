"use client";

import { useEffect, useState } from "react";
import type { PersonSearchPage } from "@persons/person-client";
import { personClient } from "@persons/person-domain/api/browser";

const SEARCH_DELAY_MS = 350;
const MIN_QUERY_LENGTH = 2;
const SEARCH_SIZE = 8;

export function usePersonSearch(value: string) {
    const query = value.trim();
    const [revision, setRevision] = useState(0);
    const [settled, setSettled] = useState<{
        key: string;
        result?: PersonSearchPage;
        failed: boolean;
    }>();
    const key = `${query}:${revision}`;
    const enabled = query.length >= MIN_QUERY_LENGTH;

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const result = await personClient.persons.searchPersons(
                    { q: query, page: 0, size: SEARCH_SIZE },
                    { signal: controller.signal },
                );

                if (!controller.signal.aborted) {
                    setSettled({ key, result, failed: false });
                }
            } catch {
                if (!controller.signal.aborted) {
                    setSettled({ key, failed: true });
                }
            }
        }, SEARCH_DELAY_MS);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [enabled, key, query]);

    return {
        enabled,
        loading: enabled && settled?.key !== key,
        failed: settled?.key === key && settled.failed,
        result: settled?.key === key ? settled.result : undefined,
        retry: () => setRevision((current) => current + 1),
    };
}
