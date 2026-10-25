'use client';

import { Avatar, Box, Skeleton } from '@gravity-ui/uikit';
import type { CSSProperties } from 'react';
import { useImageState } from '@persons/ui/useImageState';
import type { LoadedAvatarProps } from '@persons/ui/LoadedAvatar.types';
import styles from '@persons/ui/LoadingMedia.module.css';

const DEFAULT_AVATAR_SIZE = 100;

export function LoadedAvatar({ name, src, className, size = DEFAULT_AVATAR_SIZE }: LoadedAvatarProps) {
    const { ready, failed } = useImageState(src);

    return (
        <Box
            className={[styles.avatar, className].filter(Boolean).join(' ')}
            aria-busy={!ready}
            style={{ '--persons-avatar-size': `${size}px` } as CSSProperties}
        >
            {ready ? (
                <Avatar
                    size="xl"
                    shape="circle"
                    text={name}
                    imgUrl={failed ? undefined : src}
                    className={styles.visible}
                />
            ) : (
                <Skeleton className={styles.skeleton} />
            )}
        </Box>
    );
}
