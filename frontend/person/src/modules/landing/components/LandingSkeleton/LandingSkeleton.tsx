'use client';

import { Flex, Skeleton } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import styles from '@/modules/landing/components/LandingSkeleton/LandingSkeleton.module.css';

export function LandingSkeleton() {
    const t = useTranslate('common');

    return (
        <Flex
            direction="column"
            gap="5"
            role="status"
            aria-label={t('loading')}
            aria-busy="true"
            className={styles.root}
        >
            <Skeleton className={styles.title} />
            <Skeleton className={styles.input} />
            <Skeleton className={styles.description} />
        </Flex>
    );
}
