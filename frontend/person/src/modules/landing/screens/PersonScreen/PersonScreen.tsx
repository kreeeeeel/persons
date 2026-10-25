'use client';

import { Box, Flex } from '@gravity-ui/uikit';
import { SiteHeader } from '@/shared/ui/SiteHeader/SiteHeader';
import { HeroSlider } from '@/modules/landing/components/HeroSlider/HeroSlider';
import { usePreloadedImages } from '@persons/ui/loading/usePreloadedImages';
import { slides } from '@/modules/landing/model/slides';
import { LoadingPage } from '@/shared/ui/LoadingPage/LoadingPage';
import type { PersonScreenProps } from '@/modules/landing/screens/PersonScreen/PersonScreen.types';
import styles from '@/modules/landing/screens/PersonScreen/PersonScreen.module.css';

export function PersonScreen({ account, loading = false, signedIn = false }: PersonScreenProps) {
    const ready = usePreloadedImages(
        slides.map((slide) => slide.src),
        !loading,
    );

    if (loading || !ready) {
        return <LoadingPage />;
    }

    return (
        <Flex direction="column" className={styles.viewport}>
            <SiteHeader showSearch={false} showFeed={signedIn}>
                {account}
            </SiteHeader>
            <Box as="main" className={styles.canvas}>
                <HeroSlider />
            </Box>
        </Flex>
    );
}
