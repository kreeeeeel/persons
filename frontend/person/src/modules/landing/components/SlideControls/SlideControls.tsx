'use client';

import { Box, Button, Flex, Icon } from '@gravity-ui/uikit';
import { Pause, Play } from '@gravity-ui/icons';
import { useTranslate } from '@persons/i18n';
import type { SlideControlsProps } from '@/modules/landing/components/SlideControls/SlideControls.types';
import styles from '@/modules/landing/components/SlideControls/SlideControls.module.css';

export function SlideControls({
    index,
    total,
    paused,
    allowAutoplay,
    running,
    duration,
    onSelect,
    onToggle,
}: SlideControlsProps) {
    const t = useTranslate('landing');

    return (
        <Flex alignItems="center" role="group" aria-label={t('controls')} className={styles.controls}>
            {allowAutoplay && (
                <Button view="flat" size="xl" aria-label={t(paused ? 'play' : 'pause')} onClick={onToggle}>
                    <Icon data={paused ? Play : Pause} size={18} />
                </Button>
            )}
            {Array.from({ length: total }, (_, value) => (
                <Button
                    key={value}
                    size="xl"
                    view="flat"
                    aria-label={t('slide', { number: value + 1, total })}
                    selected={index === value}
                    onClick={() => onSelect(value)}
                    className={styles.dotButton}
                >
                    <Box aria-hidden="true" className={`${styles.dot} ${index === value ? styles.active : ''}`}>
                        {index === value && (
                            <Box
                                key={index}
                                className={`${styles.fill} ${!allowAutoplay ? styles.static : ''}`}
                                style={{
                                    animationDuration: `${duration}ms`,
                                    animationPlayState: running ? 'running' : 'paused',
                                }}
                            />
                        )}
                    </Box>
                </Button>
            ))}
        </Flex>
    );
}
