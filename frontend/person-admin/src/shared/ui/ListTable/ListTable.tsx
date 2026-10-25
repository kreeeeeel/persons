import type { ReactNode } from 'react';
import { Box, Button, Flex, Skeleton, Text } from '@gravity-ui/uikit';
import { EmptyState } from '@persons/person-domain/EmptyState';
import type { EmptyIllustrationKind } from '@persons/person-domain/EmptyIllustration/EmptyIllustration.types';
import { useTranslate } from '@persons/i18n';
import styles from '@/shared/ui/ListTable/ListTable.module.css';

export function ListTable({
    title,
    loading,
    empty,
    error,
    retry,
    children,
    emptyTitle,
    emptyDescription,
    illustration,
}: {
    readonly title: string;
    readonly loading: boolean;
    readonly empty: boolean;
    readonly error?: string;
    readonly retry: () => void;
    readonly children: ReactNode;
    readonly emptyTitle: string;
    readonly emptyDescription: string;
    readonly illustration: EmptyIllustrationKind;
}) {
    const common = useTranslate('common');
    return (
        <Box className={styles.frame} role="region" aria-label={title} aria-busy={loading}>
            {loading ? (
                <Flex direction="column" gap="3" className={styles.empty} role="status" aria-label={common('loading')}>
                    {[0, 1, 2, 3, 4].map((index) => (
                        <Skeleton key={index} className={styles.skeleton} />
                    ))}
                </Flex>
            ) : error ? (
                <Flex direction="column" alignItems="center" gap="3" className={styles.empty} role="alert">
                    <Text variant="subheader-2">{common('loadingErrorTitle')}</Text>
                    <Text color="secondary">{common('loadingErrorDescription')}</Text>
                    <Button size="l" onClick={retry}>
                        {common('retry')}
                    </Button>
                </Flex>
            ) : empty ? (
                <EmptyState illustration={illustration} title={emptyTitle} description={emptyDescription} />
            ) : (
                children
            )}
        </Box>
    );
}
