'use client';

import { useEffect, useState } from 'react';
import { Box, Skeleton, Text } from '@gravity-ui/uikit';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import type { TypingHeadingProps } from '@/modules/landing/components/TypingHeading/TypingHeading.types';
import styles from '@/modules/landing/components/TypingHeading/TypingHeading.module.css';

const CHARACTER_INTERVAL_MS = 45;

export function TypingHeading({ text, ready }: TypingHeadingProps) {
    const [length, setLength] = useState(0);
    const reducedMotion = useReducedMotion();
    const characters = Array.from(text);
    const visibleLines = (reducedMotion ? text : characters.slice(0, length).join('')).split('\n');

    useEffect(() => {
        if (!ready || reducedMotion) {
            return;
        }

        let count = 0;
        const timer = window.setInterval(() => {
            count += 1;
            setLength(count);

            if (count >= Array.from(text).length) {
                window.clearInterval(timer);
            }
        }, CHARACTER_INTERVAL_MS);

        return () => window.clearInterval(timer);
    }, [ready, reducedMotion, text]);

    if (!ready) {
        return <Skeleton className={styles.skeleton} />;
    }

    return (
        <Text as="h1" className={styles.heading} aria-label={text}>
            <Box as="span" aria-hidden="true">
                {text.split('\n').map((_, index) => (
                    <Box as="span" key={index} className={styles.line}>
                        {visibleLines[index] ?? ''}
                        {!reducedMotion && index === visibleLines.length - 1 && (
                            <Box as="span" className={styles.caret} />
                        )}
                    </Box>
                ))}
            </Box>
        </Text>
    );
}
