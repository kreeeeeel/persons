'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Drawer, Flex, Icon, Text } from '@gravity-ui/uikit';
import { Bars, BarsPlay, Persons, ShieldCheck, Xmark } from '@gravity-ui/icons';
import { AppLink } from '@persons/ui/AppLink';
import { PersonSearch } from '@persons/person-domain/PersonSearch';
import { LoadedImage } from '@persons/ui';
import { useLocale, useTranslate } from '@persons/i18n';
import type { SiteHeaderProps } from '@/shared/ui/SiteHeader/SiteHeader.types';
import styles from '@/shared/ui/SiteHeader/SiteHeader.module.css';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

const HEADER_TITLE = 'Те ещё люди.';

export function SiteHeader({ children, showSearch = true, showFeed = true }: SiteHeaderProps) {
    const locale = useLocale();
    const t = useTranslate('navigation');
    const [scrolled, setScrolled] = useState(false);
    const mobile = useMediaQuery('(max-width: 700px)');
    const reducedMotion = useReducedMotion();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuButton = useRef<HTMLButtonElement>(null);

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
            {!mobile && (
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
            )}
            <Button
                ref={menuButton}
                size="xl"
                view="flat"
                className={styles.menuButton}
                aria-label={t('openMenu')}
                aria-haspopup="dialog"
                aria-expanded={mobile && menuOpen}
                onClick={() => setMenuOpen(true)}
            >
                <Icon data={Bars} size={24} />
            </Button>
            <Drawer
                open={mobile && menuOpen}
                placement="right"
                size={320}
                contentClassName={styles.drawer}
                aria-label={t('menu')}
                returnFocus={menuButton}
                disableVisuallyHiddenDismiss
                disableTransition={reducedMotion}
                onOpenChange={setMenuOpen}
            >
                <Flex direction="column" gap="5">
                    <Flex alignItems="center" justifyContent="space-between">
                        <Text variant="subheader-3">{t('menu')}</Text>
                        <Button size="xl" view="flat" aria-label={t('closeMenu')} onClick={() => setMenuOpen(false)}>
                            <Icon data={Xmark} size={24} />
                        </Button>
                    </Flex>
                    {children}
                    <Flex as="nav" direction="column" gap="2" aria-label={t('menu')}>
                        {[
                            { href: 'people', label: t('people'), icon: Persons },
                            { href: 'feed', label: t('feed'), icon: BarsPlay },
                            { href: 'privacy', label: t('privacy'), icon: ShieldCheck },
                        ].map(({ href, label, icon }) => (
                            <AppLink
                                key={href}
                                href={`/${locale}/${href}`}
                                className={styles.menuLink}
                                onClick={() => setMenuOpen(false)}
                            >
                                <Icon data={icon} size={22} />
                                {label}
                            </AppLink>
                        ))}
                    </Flex>
                </Flex>
            </Drawer>
        </Flex>
    );
}
