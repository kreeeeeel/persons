"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { personError } from "@persons/person-domain/api/browser";
import { subscribeAccountProfileChanges } from "@persons/person-domain/account/profileChanges";
import type {
    PersonFeedPage,
    InfiniteFeedState,
} from "@persons/person-domain/hooks/useInfinitePersonData.types";

export function useInfinitePersonData<P extends PersonFeedPage>(
    key: string,
    loader: (page: number, signal: AbortSignal) => Promise<P>,
    externalRevision = 0,
) {
    const [revision, setRevision] = useState(0);
    const [settled, setSettled] = useState<InfiniteFeedState<P>>();
    const [append, setAppend] = useState<{
        key: string;
        pending?: boolean;
        error?: string;
    }>();
    const nextRequest = useRef<AbortController | undefined>(undefined);
    const visiblePages = useRef({ key, count: 1 });
    const requestKey = `${key}:${revision}:${externalRevision}`;
    const data = settled?.resourceKey === key ? settled.data : undefined;
    const refreshing = settled?.key !== requestKey;
    const refresh = useCallback(() => setRevision((value) => value + 1), []);
    useEffect(() => subscribeAccountProfileChanges(refresh), [refresh]);

    useEffect(() => {
        const controller = new AbortController();
        async function loadVisiblePages() {
            const count =
                visiblePages.current.key === key
                    ? visiblePages.current.count
                    : 1;
            let page = await loader(0, controller.signal);
            let combined = page;

            for (
                let index = 1;
                index < count &&
                page.items.length &&
                (page.page + 1) * page.size < page.total;
                index += 1
            ) {
                if (controller.signal.aborted) {
                    return;
                }
                page = await loader(index, controller.signal);
                combined = {
                    ...page,
                    items: Array.from(
                        new Map(
                            [...combined.items, ...page.items].map((item) => [
                                item.id,
                                item,
                            ]),
                        ).values(),
                    ),
                };
            }

            if (!controller.signal.aborted) {
                visiblePages.current = { key, count: page.page + 1 };
                setSettled({
                    key: requestKey,
                    resourceKey: key,
                    data: combined,
                    complete:
                        !page.items.length ||
                        (page.page + 1) * page.size >= page.total,
                });
            }
        }

        loadVisiblePages().catch(async (error: unknown) => {
            const code = await personError(error);
            if (!controller.signal.aborted) {
                setSettled((current) => ({
                    key: requestKey,
                    resourceKey: key,
                    data:
                        current?.resourceKey === key ? current.data : undefined,
                    complete:
                        current?.resourceKey === key
                            ? current.complete
                            : undefined,
                    error: code,
                }));
            }
        });
        return () => {
            controller.abort();
            nextRequest.current?.abort();
            nextRequest.current = undefined;
        };
    }, [key, loader, requestKey]);

    const loadMore = useCallback(() => {
        if (
            !data ||
            refreshing ||
            settled?.error ||
            settled?.complete ||
            nextRequest.current
        ) {
            return;
        }
        const controller = new AbortController();
        nextRequest.current = controller;
        setAppend({ key: requestKey, pending: true });
        loader(data.page + 1, controller.signal)
            .then((page) => {
                if (controller.signal.aborted) {
                    return;
                }
                visiblePages.current = { key, count: page.page + 1 };
                setSettled((current) => {
                    if (current?.key !== requestKey || !current.data) {
                        return current;
                    }
                    const items = Array.from(
                        new Map(
                            [...current.data.items, ...page.items].map(
                                (item) => [item.id, item],
                            ),
                        ).values(),
                    );
                    return {
                        key: requestKey,
                        resourceKey: key,
                        data: { ...page, items },
                        complete:
                            !page.items.length ||
                            (page.page + 1) * page.size >= page.total,
                    };
                });
                setAppend({ key: requestKey });
            })
            .catch(async (error: unknown) => {
                const code = await personError(error);
                if (!controller.signal.aborted) {
                    setAppend({ key: requestKey, error: code });
                }
            })
            .finally(() => {
                if (nextRequest.current === controller) {
                    nextRequest.current = undefined;
                }
            });
    }, [
        data,
        key,
        loader,
        refreshing,
        requestKey,
        settled?.complete,
        settled?.error,
    ]);

    return {
        data,
        loading: data === undefined && refreshing,
        refreshing,
        error: settled?.key === requestKey ? settled.error : undefined,
        loadingMore: append?.key === requestKey && !!append.pending,
        moreError: append?.key === requestKey ? append.error : undefined,
        hasMore: !!data && !refreshing && !settled?.complete && !settled?.error,
        loadMore,
        refresh,
    };
}
