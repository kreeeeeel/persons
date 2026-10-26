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
            <Flex className={styles.main} direction="column" gap="6" aria-busy role="status">
                <Box className={styles.columns}>
                    <Box className={styles.identity}>
                        <Flex direction="column" gap="3" alignItems="center" className={styles.avatarColumn}>
                            <Skeleton className={styles.avatar} style={{ borderRadius: '50%' }} />
                            <Skeleton style={{ width: '80%', height: 28 }} />
                            <Skeleton style={{ width: '60%', height: 28 }} />
                            <Box className={styles.facts}>
                                {[0, 1].map((key) => (
                                    <Skeleton key={key} style={{ width: '100%', height: 80, borderRadius: 18 }} />
                                ))}
                            </Box>
                        </Flex>
                        <Flex direction="column" gap="4" className={styles.biography}>
                            <Skeleton style={{ width: '70%', height: 28 }} />
                            <Skeleton style={{ width: '100%', height: 160 }} />
                            <Skeleton style={{ width: '50%', height: 36 }} />
                        </Flex>
                    </Box>
                    <Flex direction="column" gap="6" className={styles.content}>
                        <Skeleton style={{ width: '100%', height: 52, borderRadius: 20 }} />
                        <Skeleton style={{ width: '100%', height: 220, borderRadius: 20 }} />
                    </Flex>
                </Box>
            </Flex>
        </Box>
    );
}
