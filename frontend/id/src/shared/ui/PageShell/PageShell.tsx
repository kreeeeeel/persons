'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Box, Flex, Text } from '@gravity-ui/uikit';
import { LanguagePicker, useLocale, useTranslate } from '@persons/i18n';
import { ThemePicker } from '@persons/theme';
import { LoadedImage } from '@persons/ui';
import { Brand } from '@/shared/ui/Brand/Brand';
import styles from '@/shared/ui/PageShell/PageShell.module.css';

export function PageShell({ children }: { readonly children: ReactNode }) {
    const t = useTranslate('common');
    const locale = useLocale();
    const pathname = usePathname();
    const identityPage = pathname === `/${locale}` || pathname === `/${locale}/recovery`;

    if (identityPage) {
        return (
            <Flex direction="column" className={styles.shell}>
                <Box as="main" className={styles.authMain}>
                    <Flex justifyContent="center" className={styles.logo}>
                        <LoadedImage src="/media/logo.svg?v=vadim-v1" alt={t('brandAlt')} width={80} height={80} />
                    </Flex>
                    {children}
                </Box>
            </Flex>
        );
    }

    return (
        <Flex direction="column" className={styles.shell}>
            <Flex as="header" alignItems="center" justifyContent="space-between" wrap className={styles.header}>
                <Brand />
                <Flex alignItems="center" gap="2">
                    <LanguagePicker />
                    <ThemePicker
                        labels={{ theme: t('theme'), light: t('light'), dark: t('dark'), system: t('system') }}
                    />
                </Flex>
            </Flex>
            <Box as="main" className={styles.main}>
                <Box className={styles.content}>{children}</Box>
            </Box>
            <Flex as="footer" justifyContent="space-between" gap="3" wrap className={styles.footer}>
                <Text>{t('tagline')}</Text>
                <Text>{t('madeForFriends')}</Text>
            </Flex>
        </Flex>
    );
}
