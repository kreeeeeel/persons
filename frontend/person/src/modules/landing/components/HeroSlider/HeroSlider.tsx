'use client';

import { useCallback, useRef, useState } from 'react';
import { Box, Flex, Icon, Text } from '@gravity-ui/uikit';
import { ArrowUpRight } from '@gravity-ui/icons';
import { AppLink } from '@persons/ui/AppLink';
import { useLocale, useTranslate } from '@persons/i18n';
import { useImageState } from '@persons/ui/useImageState';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { slides, SLIDE_INTERVAL_MS } from '@/modules/landing/model/slides';
import { useSlideTimer } from '@/modules/landing/hooks/useSlideTimer';
import { HeroSlide } from '@/modules/landing/components/HeroSlide/HeroSlide';
import { TypingHeading } from '@/modules/landing/components/TypingHeading/TypingHeading';
import { PersonSearch } from '@persons/person-domain/PersonSearch';
import { SlideControls } from '@/modules/landing/components/SlideControls/SlideControls';
import styles from '@/modules/landing/components/HeroSlider/HeroSlider.module.css';

export function HeroSlider() {
    const t = useTranslate('landing');
    const locale = useLocale();
    const container = useRef<HTMLDivElement>(null);
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [focused, setFocused] = useState(false);
    const reducedMotion = useReducedMotion();
    const current = slides[index];
    const { ready } = useImageState(current.src);

    const advance = useCallback(() => setIndex((value) => (value + 1) % slides.length), []);
    const running = useSlideTimer(
        `${index}:${reducedMotion}`,
        !paused && !focused && !reducedMotion && ready,
        SLIDE_INTERVAL_MS,
        advance,
    );

    function select(value: number) {
        setIndex(value);
        setPaused(true);
    }

    return (
        <Box
            role="region"
            ref={container}
            aria-busy={!ready}
            aria-label={t('slideshow')}
            aria-roledescription={t('carouselRole')}
            className={styles.hero}
            onFocusCapture={() => setFocused(true)}
            onBlurCapture={(event) => {
                if (!container.current?.contains(event.relatedTarget)) {
                    setFocused(false);
                }
            }}
        >
            {slides.map((slide, value) => (
                <HeroSlide
                    key={slide.id}
                    src={slide.src}
                    alt={t(slide.alt)}
                    active={index === value}
                    priority={value === 0}
                />
            ))}
            <Box className={styles.scrim} aria-hidden="true" />
            <Flex direction="column" className={styles.content}>
                <TypingHeading key={current.id} text={t(current.title)} ready={ready} />
                <PersonSearch />
                <Text as="p" className={styles.description}>
                    {t('directoryPrefix')}{' '}
                    <AppLink href={`/${locale}/people`} className={styles.directoryLink}>
                        {t('directoryLink')}
                        <Icon data={ArrowUpRight} size={18} />
                    </AppLink>
                </Text>
            </Flex>
            <Box className={styles.controls}>
                <SlideControls
                    index={index}
                    total={slides.length}
                    paused={paused}
                    allowAutoplay={!reducedMotion}
                    running={running}
                    duration={SLIDE_INTERVAL_MS}
                    onSelect={select}
                    onToggle={() => {
                        setPaused((value) => !value);
                        setFocused(false);
                    }}
                />
            </Box>
        </Box>
    );
}
