"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
    readSharedContent,
    updateContentQuery,
} from "@persons/person-domain/content/shareLink";
import type { ShareableContentKind } from "@persons/person-domain/content/shareLink";

const LOCATION_EVENT = "persons:media-location";
const OWNER_KEY = "personsContentOwner";
const snapshot = () => window.location.href;
const serverSnapshot = () => "";

function subscribe(notify: () => void) {
    window.addEventListener("popstate", notify);
    window.addEventListener(LOCATION_EVENT, notify);
    return () => {
        window.removeEventListener("popstate", notify);
        window.removeEventListener(LOCATION_EVENT, notify);
    };
}

export function useContentLocation(tag?: string) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    useEffect(() => {
        window.dispatchEvent(new Event(LOCATION_EVENT));
    }, [pathname, searchParams]);
    const location = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
    const owner = useRef<string>(undefined);
    const url = location ? new URL(location) : undefined;
    const content =
        tag && url?.pathname.split("/").at(-1) === tag
            ? readSharedContent(url.search)
            : undefined;

    const open = useCallback((kind: ShareableContentKind, id: string) => {
        owner.current ??= crypto.randomUUID();
        const current = new URL(window.location.href);
        const next = updateContentQuery(current, kind, id);
        if (readSharedContent(current.search)) {
            window.history.replaceState(window.history.state, "", next);
        } else {
            window.history.pushState(
                { ...window.history.state, [OWNER_KEY]: owner.current },
                "",
                next,
            );
        }
        window.dispatchEvent(new Event(LOCATION_EVENT));
    }, []);

    const close = useCallback(() => {
        if (
            owner.current &&
            window.history.state?.[OWNER_KEY] === owner.current
        ) {
            window.history.back();
        } else {
            window.history.replaceState(
                window.history.state,
                "",
                updateContentQuery(new URL(window.location.href)),
            );
            window.dispatchEvent(new Event(LOCATION_EVENT));
        }
    }, []);

    return { content, open, close };
}
