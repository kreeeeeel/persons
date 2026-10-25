"use client";

import { useCallback, useEffect } from "react";
import { personClient } from "@persons/person-domain/api/browser";
import { usePersonData } from "@persons/person-domain/hooks/usePersonData";

const REFRESH_DELAY_MS = 10000;

export function useMediaQualities(id: string, enabled: boolean) {
    const load = useCallback(
        (signal: AbortSignal) =>
            enabled
                ? personClient.mediaQuality.listMediaQualities(
                      { id },
                      { signal },
                  )
                : Promise.resolve({ items: [], processing: false }),
        [id, enabled],
    );
    const resource = usePersonData(`qualities:${id}:${enabled}`, load);
    useEffect(() => {
        if (!enabled || !resource.data?.processing || resource.refreshing) {
            return;
        }
        const timer = setTimeout(resource.refresh, REFRESH_DELAY_MS);
        return () => clearTimeout(timer);
    }, [
        enabled,
        resource.data?.processing,
        resource.refreshing,
        resource.refresh,
    ]);
    return {
        sources: (resource.data?.items ?? []).map((quality) => ({
            src: `/api/person/v1/media/${id}/qualities/${quality.height}/content`,
            label: `${quality.height}p`,
        })),
        processing: resource.data?.processing ?? false,
        error: resource.error,
        retry: resource.refresh,
    };
}
