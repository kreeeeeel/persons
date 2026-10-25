'use client';

import { Flex, Text } from '@gravity-ui/uikit';
import { LoadedImage } from '@persons/ui';
import { brandName } from '@persons/assets/brand';
import type { BrandProps } from '@/shared/ui/Brand/Brand.types';
import styles from '@/shared/ui/Brand/Brand.module.css';

export function Brand({ mail = false, showLogo = true }: BrandProps) {
    return (
        <Flex alignItems="center" gap="3" className={styles.brand}>
            {showLogo && (
                <LoadedImage
                    src={mail ? '/media/mail.svg' : '/media/logo.svg?v=vadim-v1'}
                    alt=""
                    width={44}
                    height={44}
                />
            )}
            <Text className={styles.wordmark}>{brandName}</Text>
        </Flex>
    );
}
