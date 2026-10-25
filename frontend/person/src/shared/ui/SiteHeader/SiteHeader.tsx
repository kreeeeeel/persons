'use client';

import { useEffect, useState } from 'react';
import { Box, Flex, Icon, Text } from '@gravity-ui/uikit';
import { BarsPlay, ShieldCheck } from '@gravity-ui/icons';
import { AppLink } from '@persons/ui/AppLink';
import { PersonSearch } from '@persons/person-domain/PersonSearch';
import { LoadedImage } from '@persons/ui';
import { useLocale, useTranslate } from '@persons/i18n';
import type { SiteHeaderProps } from '@/shared/ui/SiteHeader/SiteHeader.types';
import styles from '@/shared/ui/SiteHeader/SiteHeader.module.css';

const HEADER_TITLE = 'Те ещё люди.';

export function SiteHeader({ children, showSearch = true, showFeed = true }: SiteHeaderProps) {
    const locale = useLocale();
    const t = useTranslate('navigation');
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const update = () => setScrolled(window.scrollY > 12);
        update();
        window.addEventListener('scroll', update, { passive: true });
        return () => window.removeEventListener('scroll', update);
    }, []);

    return (
        <Flex
            as="header"
            alignItems="center"
            justifyContent="space-between"
            className={styles.header}
            data-scrolled={scrolled}
            data-search={showSearch}
        >
            <Flex alignItems="center" className={styles.navigation}>
                <AppLink href={`/${locale}`} view="primary" className={styles.brand} aria-label={HEADER_TITLE}>
                    <LoadedImage src="/media/logo.svg?v=vadim-v1" alt="" width={40} height={40} />
                    <Text className={styles.wordmark}>{HEADER_TITLE}</Text>
                </AppLink>
                {showSearch && (
                    <Box className={styles.search}>
                        <PersonSearch variant="compact" />
                    </Box>
                )}
            </Flex>
            <Flex alignItems="center" className={styles.actions}>
                {showFeed && (
                    <AppLink
                        href={`/${locale}/feed`}
                        className={`${styles.legal} ${styles.feed}`}
                        aria-label={t('feed')}
                    >
                        <Icon data={BarsPlay} size={20} />
                        <Text className={styles.feedLabel}>{t('feed')}</Text>
                    </AppLink>
                )}
                <AppLink href={`/${locale}/privacy`} className={styles.legal} aria-label={t('privacy')}>
                    <Icon data={ShieldCheck} size={20} />
                    <Text className={styles.privacyFull}>{t('privacy')}</Text>
                </AppLink>
                <Box className={styles.account}>{children}</Box>
            </Flex>
        </Flex>
    );
}
