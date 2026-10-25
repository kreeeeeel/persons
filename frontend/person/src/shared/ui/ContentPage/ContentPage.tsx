'use client';

import type { ReactNode } from 'react';
import { Box } from '@gravity-ui/uikit';
import { SiteHeader } from '@/shared/ui/SiteHeader/SiteHeader';
import styles from '@/shared/ui/ContentPage/ContentPage.module.css';
import { ScrollToTop } from '@/shared/ui/ScrollToTop/ScrollToTop';

export function ContentPage({
    account,
    children,
    showSearch = false,
}: {
    readonly account: ReactNode;
    readonly children: ReactNode;
    readonly showSearch?: boolean;
}) {
    return (
        <Box className={styles.page} data-search={showSearch}>
            <SiteHeader showSearch={showSearch}>{account}</SiteHeader>
            <Box as="main" className={styles.main}>
                {children}
            </Box>
            <ScrollToTop />
        </Box>
    );
}
