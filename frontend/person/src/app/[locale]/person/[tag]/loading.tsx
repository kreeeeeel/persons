'use client';

import { Box, Flex, Skeleton } from '@gravity-ui/uikit';
import { SiteHeader } from '@/shared/ui/SiteHeader/SiteHeader';
import { HeaderSkeleton } from '@/shared/ui/HeaderSkeleton/HeaderSkeleton';
import styles from '@/modules/profile/components/ProfileScreen/ProfileScreen.module.css';

export default function Loading() {
    return (
        <Box className={styles.page}>
            <SiteHeader>
                <HeaderSkeleton />
            </SiteHeader>
            <Flex className={styles.main} direction="column" gap="6" aria-busy>
                <Box className={styles.identity}>
                    <Skeleton className={styles.avatar} style={{ borderRadius: '50%' }} />
                    <Flex direction="column" gap="4" className={styles.biography}>
                        <Skeleton style={{ width: '65%', height: 48 }} />
                        <Skeleton style={{ width: '80%', height: 32 }} />
                        <Skeleton style={{ width: '100%', height: 96 }} />
                        <Skeleton style={{ width: '60%', height: 48 }} />
                    </Flex>
                </Box>
                <Skeleton style={{ height: 110, borderRadius: 24 }} />
                <Skeleton style={{ height: 52, borderRadius: 24 }} />
                <Skeleton style={{ height: 200, borderRadius: 24 }} />
            </Flex>
        </Box>
    );
}
