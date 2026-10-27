"use client";

import { useCallback } from "react";
import type { ReactNode } from "react";
import { personClient } from "@persons/person-domain/api/browser";
import { usePersonData } from "@persons/person-domain/hooks/usePersonData";
import { TagDictionaryContext } from "@persons/person-domain/tags/TagDictionaryContext";

export function TagDictionaryProvider({
    children,
}: {
    readonly children: ReactNode;
}) {
    const load = useCallback(
        (signal: AbortSignal) =>
            personClient.tags.listTagDefinitions({ signal }),
        [],
    );
    const resource = usePersonData("tag-dictionary", load);
    return (
        <TagDictionaryContext
            value={{
                definitions: resource.data ?? [],
                loading: resource.loading,
                error: resource.error,
                refresh: resource.refresh,
            }}
        >
            {children}
        </TagDictionaryContext>
    );
}
