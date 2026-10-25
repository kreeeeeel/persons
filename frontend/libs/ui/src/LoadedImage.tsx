'use client';

import { Box, Skeleton } from '@gravity-ui/uikit';
import { useState } from 'react';
import type { LoadedImageProps } from '@persons/ui/LoadedImage.types';
import styles from '@persons/ui/LoadingMedia.module.css';

export function LoadedImage({
    src,
    alt,
    width,
    height,
    className,
    responsive = false,
    objectFit = 'contain',
    loading = 'eager',
}: LoadedImageProps) {
    const [settled, setSettled] = useState<string>();
    const ready = settled === src;

    return (
        <Box
            className={[styles.frame, responsive ? styles.responsive : ''].filter(Boolean).join(' ')}
            style={responsive ? { width: '100%', aspectRatio: `${width}/${height}` } : { width, height }}
            aria-busy={!ready}
        >
            {!ready && <Skeleton className={styles.skeleton} />}
            <Box
                as="img"
                src={src}
                alt={alt}
                width={width}
                height={height}
                loading={loading}
                decoding="async"
                onLoad={() => setSettled(src)}
                onError={() => setSettled(src)}
                ref={(image: HTMLImageElement | null) => {
                    if (image?.complete) {
                        setSettled(src);
                    }
                }}
                style={
                    responsive
                        ? {
                              width: '100%',
                              height: '100%',
                              objectFit,
                          }
                        : { objectFit }
                }
                className={[ready ? styles.visible : styles.hidden, className].filter(Boolean).join(' ')}
            />
        </Box>
    );
}
