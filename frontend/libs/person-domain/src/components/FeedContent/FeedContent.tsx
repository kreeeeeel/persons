"use client";

import { Flex, Skeleton } from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";
import { LoadError } from "@persons/ui/loading/LoadError";
import { EmptyState } from "@persons/person-domain/EmptyState";
import type { FeedContentProps } from "@persons/person-domain/FeedContent/FeedContent.types";
import styles from "@persons/person-domain/FeedContent/FeedContent.module.css";

export function FeedContent({
    loading,
    skeleton,
    error,
    retainContentOnError = false,
    empty,
    emptyTitle,
    emptyDescription,
    emptyAction,
    illustration = "history",
    onRetry,
    children,
}: FeedContentProps) {
    const t = useTranslate("person");
    const common = useTranslate("common");

    if (loading) {
        if (skeleton) {
            return skeleton;
        }
        return (
            <Flex
                direction="column"
                gap="4"
                aria-busy="true"
                role="status"
                aria-label={t("loading")}
            >
                {[0, 1, 2].map((value) => (
                    <Skeleton key={value} className={styles.skeleton} />
                ))}
            </Flex>
        );
    }

    const failure = error ? (
        <LoadError
            title={common("loadingErrorTitle")}
            description={t(error)}
            retryLabel={t("retry")}
            onRetry={onRetry}
        />
    ) : null;

    if (error && (!retainContentOnError || empty)) {
        return failure;
    }

    if (empty) {
        return (
            <EmptyState
                illustration={illustration}
                title={emptyTitle}
                description={emptyDescription}
                action={emptyAction}
            />
        );
    }

    return (
        <>
            {failure}
            {children}
        </>
    );
}
