"use client";

import { Box, Flex, Text } from "@gravity-ui/uikit";
import { EmptyIllustration } from "@persons/person-domain/EmptyIllustration";
import type { EmptyStateProps } from "@persons/person-domain/EmptyState/EmptyState.types";
import styles from "@persons/person-domain/EmptyState/EmptyState.module.css";

export function EmptyState({
    illustration,
    title,
    description,
    action,
    compact = false,
}: EmptyStateProps) {
    return (
        <Flex
            direction="column"
            alignItems="center"
            gap="3"
            className={styles.root}
            data-compact={compact}
            role="status"
        >
            <Box className={styles.art}>
                <EmptyIllustration kind={illustration} />
            </Box>
            {title && (
                <Text
                    as={compact ? "p" : "h2"}
                    variant={compact ? "subheader-2" : "header-1"}
                >
                    {title}
                </Text>
            )}
            {description && <Text color="secondary">{description}</Text>}
            {action}
        </Flex>
    );
}
