'use client';

import { Flex, Skeleton } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import styles from '@/shared/ui/HeaderSkeleton/HeaderSkeleton.module.css';

export function HeaderSkeleton() {
    const t = useTranslate('common');

    return (
        <Flex
            alignItems="center"
            gap="2"
            className={styles.root}
            role="status"
            aria-label={t('loading')}
            aria-busy="true"
        >
            <Skeleton className={styles.avatar} />
            <Skeleton className={styles.name} />
        </Flex>
    );
}
