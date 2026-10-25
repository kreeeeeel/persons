'use client';

import { Flex } from '@gravity-ui/uikit';
import { BrandLoader } from '@persons/ui/BrandLoader';
import type { PageLoaderProps } from '@persons/ui/PageLoader/PageLoader.types';
import styles from '@persons/ui/PageLoader/PageLoader.module.css';

export function PageLoader({ label }: PageLoaderProps) {
    return (
        <Flex alignItems="center" justifyContent="center" className={styles.page}>
            <BrandLoader label={label} size={80} />
        </Flex>
    );
}
