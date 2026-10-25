'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Flex, Box, Button, Drawer, Icon, Skeleton } from '@gravity-ui/uikit';
import { Bars, Xmark } from '@gravity-ui/icons';
import { useTranslate } from '@persons/i18n';
import { AccountMenu } from '@/modules/account/components/AccountMenu/AccountMenu';
import type { HeaderUser } from '@/modules/account/model/HeaderUser';
import { Brand } from '@/shared/ui/Brand/Brand';
import { AdminNavigation } from '@/modules/person/components/AdminNavigation/AdminNavigation';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import styles from '@/shared/ui/PageShell/PageShell.module.css';

export function PageShell({
    children,
    user,
    profileHref = '/',
    publicUrl,
}: {
    readonly children: ReactNode;
    readonly user?: HeaderUser | null;
    readonly profileHref?: string;
    readonly publicUrl?: string;
}) {
    const t = useTranslate('cms');
    const mobile = useMediaQuery('(max-width: 800px)');
    const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    const [menuOpen, setMenuOpen] = useState(false);
    const menuButton = useRef<HTMLButtonElement>(null);
    const sidebar = (
        <Flex direction="column" className={styles.sidebarContent}>
            <Flex alignItems="center" justifyContent="space-between" gap="2" className={styles.brand}>
                <Brand />
                {mobile && (
                    <Button size="l" view="flat" aria-label={t('closeNavigation')} onClick={() => setMenuOpen(false)}>
                        <Icon data={Xmark} size={20} />
                    </Button>
                )}
            </Flex>
            <Box className={styles.navigation}>
                <AdminNavigation onNavigate={() => setMenuOpen(false)} />
            </Box>
            {user === undefined && <Skeleton className={styles.accountSkeleton} />}
            {user && (
                <Box className={styles.settings}>
                    <AccountMenu sidebar user={user} profileHref={profileHref} publicUrl={publicUrl} />
                </Box>
            )}
        </Flex>
    );

    return (
        <Flex className={styles.shell}>
            <Flex alignItems="center" gap="3" className={styles.mobileHeader}>
                <Button
                    ref={menuButton}
                    size="l"
                    view="normal"
                    aria-label={t('openNavigation')}
                    aria-haspopup="dialog"
                    aria-expanded={mobile && menuOpen}
                    onClick={() => setMenuOpen(true)}
                >
                    <Icon data={Bars} size={24} />
                </Button>
                <Brand />
            </Flex>
            {!mobile && (
                <Box as="aside" className={styles.sidebar}>
                    {sidebar}
                </Box>
            )}
            <Drawer
                open={mobile && menuOpen}
                placement="left"
                size={288}
                contentClassName={styles.drawerContent}
                aria-label={t('navigationTitle')}
                returnFocus={menuButton}
                disableVisuallyHiddenDismiss
                disableTransition={reducedMotion}
                onOpenChange={setMenuOpen}
                onTransitionOutComplete={() => setMenuOpen(false)}
            >
                {sidebar}
            </Drawer>
            <Box as="main" className={styles.main}>
                {children}
            </Box>
        </Flex>
    );
}
