'use client';

import { Box, Skeleton } from '@gravity-ui/uikit';
import { useImageState } from '@persons/ui/useImageState';
import type { HeroSlideProps } from '@/modules/landing/components/HeroSlide/HeroSlide.types';
import styles from '@/modules/landing/components/HeroSlide/HeroSlide.module.css';

export function HeroSlide({ src, alt, active, priority }: HeroSlideProps) {
    const { ready } = useImageState(src);

    return (
        <Box className={`${styles.slide} ${active ? styles.active : ''}`} aria-hidden={!active}>
            {!ready && <Skeleton className={styles.skeleton} />}
            <Box
                as="img"
                src={src}
                alt={alt}
                fetchPriority={priority ? 'high' : 'low'}
                decoding="async"
                className={`${styles.image} ${ready ? styles.ready : ''}`}
            />
        </Box>
    );
}
