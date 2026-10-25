'use client';

import { useLayoutEffect, useRef } from 'react';
import { Box } from '@gravity-ui/uikit';
import { TextMarquee } from '@persons/ui/TextMarquee';
import type { TextMarqueeProps } from '@persons/ui/TextMarquee/TextMarquee.types';
import styles from '@persons/ui/BottomMarquee/BottomMarquee.module.css';

export function BottomMarquee(props: Omit<TextMarqueeProps, 'view'>) {
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const element = ref.current;

        if (!element) {
            return;
        }

        const updateHeight = () => {
            document.documentElement.style.setProperty(
                '--persons-bottom-marquee-height',
                `${element.getBoundingClientRect().height}px`,
            );
        };
        const observer = new ResizeObserver(updateHeight);

        observer.observe(element);
        updateHeight();

        return () => {
            observer.disconnect();
            document.documentElement.style.removeProperty('--persons-bottom-marquee-height');
        };
    }, []);

    return (
        <Box ref={ref} className={styles.root}>
            <TextMarquee {...props} view="glass" />
        </Box>
    );
}
