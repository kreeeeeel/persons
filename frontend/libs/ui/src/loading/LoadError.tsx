'use client';

import { useContext } from 'react';
import { Box, Button, Flex, Text } from '@gravity-ui/uikit';
import { LoadedImage } from '@persons/ui/LoadedImage';
import { LoadErrorContext } from '@persons/ui/loading/LoadErrorContext';
import styles from '@persons/ui/loading/LoadError.module.css';

export function LoadError({
    title,
    description,
    retryLabel,
    onRetry,
    variant,
}: {
    readonly title: string;
    readonly description: string;
    readonly retryLabel: string;
    readonly onRetry: () => void;
    readonly variant?: 'page' | 'dialog';
}) {
    const scope = useContext(LoadErrorContext);
    const dialog = (variant ?? scope) === 'dialog';
    return (
        <Flex direction="column" alignItems="center" gap="3" role="alert" className={styles.root}>
            <Box className={styles.art}>
                <LoadedImage
                    src={`/media/${dialog ? 'error-modal-nikita' : 'error-page-stepa-slava'}-v1.webp`}
                    alt=""
                    width={1200}
                    height={800}
                    responsive
                />
            </Box>
            <Text as="h2" variant="header-1" className={styles.title}>
                {title}
            </Text>
            <Text as="p" color="secondary" className={styles.description}>
                {description}
            </Text>
            <Button size="xl" view="action" onClick={onRetry}>
                {retryLabel}
            </Button>
        </Flex>
    );
}
