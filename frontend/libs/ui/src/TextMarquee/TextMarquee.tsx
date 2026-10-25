'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Flex, Skeleton, Text } from '@gravity-ui/uikit';
import type { TextMarqueeProps } from '@persons/ui/TextMarquee/TextMarquee.types';
import styles from '@persons/ui/TextMarquee/TextMarquee.module.css';

const REPETITIONS_SET_REPETITIONS_1 = 1;
const UPDATE_REPETITIONS_0 = 0;
const UPDATE_REPETITIONS_1 = 1;
const WORDS_LENGTH_0 = 0;
const FOCUSABLE_TAB_INDEX = 0;
const MAP_0 = 0;
const MAP_1 = 1;
const CLASS_NAME_1 = 1;
const REF_0 = 0;
const CLASS_NAME_0 = 0;
const ARIA_HIDDEN_0 = 0;

export function TextMarquee({ items, label, loading = false, className, view = 'brand' }: TextMarqueeProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const groupRef = useRef<HTMLUListElement>(null);
    const [repetitions, setRepetitions] = useState(REPETITIONS_SET_REPETITIONS_1);
    const words = items.map((item) => item.trim()).filter(Boolean);

    useEffect(() => {
        const root = rootRef.current;
        const group = groupRef.current;

        if (loading || !root || !group) {
            return;
        }

        const updateRepetitions = () => {
            const groupWidth = group.getBoundingClientRect().width;

            if (groupWidth > UPDATE_REPETITIONS_0) {
                setRepetitions(Math.max(UPDATE_REPETITIONS_1, Math.ceil(root.clientWidth / groupWidth)));
            }
        };
        const observer = new ResizeObserver(updateRepetitions);

        observer.observe(root);
        observer.observe(group);
        updateRepetitions();

        return () => observer.disconnect();
    }, [items, loading]);

    if (!loading && words.length === WORDS_LENGTH_0) {
        return null;
    }

    return (
        <Box
            ref={rootRef}
            className={[styles.root, className].filter(Boolean).join(' ')}
            data-view={view}
            role={label ? 'region' : undefined}
            aria-label={label}
            aria-busy={loading}
            tabIndex={loading ? undefined : FOCUSABLE_TAB_INDEX}
        >
            {loading ? (
                <Skeleton className={styles.skeleton} />
            ) : (
                <Flex className={styles.track}>
                    {[MAP_0, MAP_1].map((copy) => (
                        <Flex className={`${styles.cycle} ${copy === CLASS_NAME_1 ? styles.copy : ''}`} key={copy}>
                            {Array.from({ length: repetitions }, (_, repetition) => (
                                <Flex
                                    as="ul"
                                    ref={copy === REF_0 && repetition === REF_0 ? groupRef : undefined}
                                    alignItems="center"
                                    className={`${styles.group} ${repetition > CLASS_NAME_0 ? styles.repetition : ''}`}
                                    aria-hidden={copy > ARIA_HIDDEN_0 || repetition > ARIA_HIDDEN_0 ? true : undefined}
                                    key={repetition}
                                >
                                    {words.map((word, index) => (
                                        <Text as="li" variant="body-2" className={styles.item} key={`${index}:${word}`}>
                                            {word}
                                        </Text>
                                    ))}
                                </Flex>
                            ))}
                        </Flex>
                    ))}
                </Flex>
            )}
        </Box>
    );
}
