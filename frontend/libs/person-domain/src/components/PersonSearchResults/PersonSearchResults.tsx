"use client";

import { Box, Button, Flex, Skeleton, Text } from "@gravity-ui/uikit";
import { EmptyState } from "@persons/person-domain/EmptyState";
import { PersonIdentity } from "@persons/person-domain/PersonIdentity";
import { AppLink } from "@persons/ui/AppLink";
import { useTranslate } from "@persons/i18n";
import type { PersonSearchResultsProps } from "@persons/person-domain/PersonSearchResults/PersonSearchResults.types";
import styles from "@persons/person-domain/PersonSearchResults/PersonSearchResults.module.css";

export function PersonSearchResults({
    id,
    compact,
    loading,
    failed,
    result,
    active,
    onActive,
    onRetry,
    onSelect,
}: PersonSearchResultsProps) {
    const t = useTranslate("person");

    return (
        <Box className={styles.popup} data-compact={compact}>
            {loading ? (
                <Flex
                    direction="column"
                    gap="3"
                    role="status"
                    aria-label={t("searching")}
                    className={styles.placeholder}
                >
                    {[0, 1, 2, 3].map((row) => (
                        <Flex key={row} alignItems="center" gap="3">
                            <Skeleton className={styles.avatarSkeleton} />
                            <Skeleton className={styles.textSkeleton} />
                        </Flex>
                    ))}
                </Flex>
            ) : failed ? (
                <Flex
                    direction="column"
                    alignItems="center"
                    gap="3"
                    className={styles.placeholder}
                    role="alert"
                >
                    <Text>{t("searchError")}</Text>
                    <Button size="l" onClick={onRetry}>
                        {t("searchRetry")}
                    </Button>
                </Flex>
            ) : result?.items.length ? (
                <Box>
                    <Text as="p" color="secondary" className={styles.count}>
                        {t("searchCount", { count: result.total })}
                    </Text>
                    <Flex
                        direction="column"
                        role="listbox"
                        id={id}
                        aria-label={t("searchResults")}
                    >
                        {result.items.map((person, index) => (
                            <AppLink
                                key={person.id}
                                href={`/${person.tag}`}
                                role="option"
                                id={`${id}-${person.id}`}
                                aria-selected={index === active}
                                onMouseEnter={() => onActive(index)}
                                onClick={onSelect}
                                className={styles.item}
                            >
                                <PersonIdentity
                                    person={person}
                                    size={44}
                                    showTag
                                />
                            </AppLink>
                        ))}
                    </Flex>
                </Box>
            ) : (
                <EmptyState
                    illustration="search"
                    title={t("searchEmpty")}
                    description={t("searchEmptyDescription")}
                    compact
                />
            )}
        </Box>
    );
}
