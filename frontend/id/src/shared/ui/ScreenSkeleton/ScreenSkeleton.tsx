'use client';

import { Flex, Skeleton } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import styles from '@/shared/ui/ScreenSkeleton/ScreenSkeleton.module.css';

export function ScreenSkeleton() {
    const t = useTranslate('common');

    return (
        <Flex direction="column" gap="4" role="status" aria-busy="true" aria-label={t('loading')}>
            <Skeleton className={styles.title} />
            <Skeleton className={styles.label} />
            <Skeleton className={styles.field} />
            <Skeleton className={styles.label} />
            <Skeleton className={styles.field} />
            <Skeleton className={styles.link} />
            <Skeleton className={styles.button} />
            <Skeleton className={styles.link} />
            <Skeleton className={styles.button} />
        </Flex>
    );
}
