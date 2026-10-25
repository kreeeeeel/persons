'use client';

import { Box, Flex } from '@gravity-ui/uikit';
import type { BrandLoaderProps } from '@persons/ui/BrandLoader/BrandLoader.types';
import styles from '@persons/ui/BrandLoader/BrandLoader.module.css';

export function BrandLoader({ label, compact = false, size }: BrandLoaderProps) {
    return (
        <Flex
            alignItems="center"
            justifyContent="center"
            className={compact ? styles.compact : styles.loader}
            role="status"
            aria-label={label}
            aria-busy="true"
        >
            <Box
                as="img"
                src="/media/logo.svg?v=vadim-v1"
                alt=""
                width={size ?? (compact ? 24 : 40)}
                height={size ?? (compact ? 24 : 40)}
                className={styles.logo}
            />
        </Flex>
    );
}
