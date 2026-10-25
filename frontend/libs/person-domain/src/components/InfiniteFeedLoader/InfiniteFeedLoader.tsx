"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Box, Button, Flex, Text } from "@gravity-ui/uikit";
import { BrandLoader } from "@persons/ui/BrandLoader";
import { useTranslate } from "@persons/i18n";
import type { InfiniteFeedLoaderProps } from "@persons/person-domain/InfiniteFeedLoader/InfiniteFeedLoader.types";
import styles from "@persons/person-domain/InfiniteFeedLoader/InfiniteFeedLoader.module.css";

const PREFETCH_MARGIN = "200px 0px";
const subscribe = () => () => undefined;
const supportsObserver = () => typeof IntersectionObserver !== "undefined";
const serverSnapshot = () => true;

export function InfiniteFeedLoader({
    hasMore,
    loadingMore,
    moreError,
    loadMore,
    active = true,
}: InfiniteFeedLoaderProps) {
    const automatic = useSyncExternalStore(
        subscribe,
        supportsObserver,
        serverSnapshot,
    );
    const sentinel = useRef<HTMLDivElement>(null);
    const t = useTranslate("person");
    useEffect(() => {
        if (
            !active ||
            !hasMore ||
            loadingMore ||
            moreError ||
            !sentinel.current ||
            typeof IntersectionObserver === "undefined"
        ) {
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    loadMore();
                }
            },
            { rootMargin: PREFETCH_MARGIN },
        );
        observer.observe(sentinel.current);
        return () => observer.disconnect();
    }, [active, hasMore, loadingMore, moreError, loadMore]);

    if (!hasMore && !loadingMore) {
        return null;
    }
    return (
        <Box ref={sentinel} className={styles.sentinel}>
            {loadingMore ? (
                <BrandLoader label={t("loading")} />
            ) : moreError ? (
                <Flex
                    direction="column"
                    alignItems="center"
                    gap="3"
                    role="alert"
                >
                    <Text>{t(moreError)}</Text>
                    <Button size="l" onClick={loadMore}>
                        {t("retry")}
                    </Button>
                </Flex>
            ) : !automatic ? (
                <Button
                    className={styles.more}
                    size="l"
                    view="flat"
                    onClick={loadMore}
                >
                    {t("loadMore")}
                </Button>
            ) : null}
        </Box>
    );
}
