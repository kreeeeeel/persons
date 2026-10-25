'use client';

import { useState } from 'react';
import { Button, Flex, Icon, Popup, Text } from '@gravity-ui/uikit';
import { Check, ChevronLeft, ChevronRight, Gear } from '@gravity-ui/icons';
import { PLAYBACK_SPEEDS } from '@persons/ui/VideoPlayer/playbackPreferences';
import type { PlayerSettingsProps } from '@persons/ui/VideoPlayer/components/PlayerSettings/PlayerSettings.types';
import styles from '@persons/ui/VideoPlayer/components/PlayerSettings/PlayerSettings.module.css';

export function PlayerSettings({
    labels,
    speed,
    quality,
    sources,
    onSpeed,
    onQuality,
    notice,
    onRetry,
}: PlayerSettingsProps) {
    const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState(false);
    const [section, setSection] = useState<'speed' | 'quality'>();
    return (
        <>
            <Button
                ref={setAnchor}
                view="flat"
                size="l"
                className={styles.trigger}
                aria-label={labels.settings}
                title={labels.settings}
                aria-expanded={open}
                aria-haspopup="menu"
                onClick={() => {
                    setSection(undefined);
                    setOpen(!open);
                }}
            >
                <Icon data={Gear} size={20} />
            </Button>
            <Popup
                open={open}
                anchorElement={anchor}
                disablePortal
                placement="top-end"
                offset={12}
                onOpenChange={setOpen}
                className={styles.popup}
            >
                <Flex direction="column" className={styles.menu} role="menu" aria-label={labels.settings}>
                    {section ? (
                        <>
                            <Button view="flat" size="l" className={styles.item} onClick={() => setSection(undefined)}>
                                <Icon data={ChevronLeft} size={16} />
                                {labels[section]}
                            </Button>
                            <Flex direction="column" className={styles.options}>
                                {section === 'quality' && notice && <Text color="secondary">{notice}</Text>}
                                {section === 'quality' && onRetry && (
                                    <Button view="flat" onClick={onRetry}>
                                        {labels.retry}
                                    </Button>
                                )}
                                {(section === 'speed'
                                    ? PLAYBACK_SPEEDS.map((value) => ({ value: String(value), label: `${value}×` }))
                                    : sources.map((source) => ({ value: source.src, label: source.label }))
                                ).map((item) => {
                                    const selected =
                                        section === 'speed' ? Number(item.value) === speed : item.value === quality;
                                    return (
                                        <Button
                                            key={item.value}
                                            view="flat"
                                            size="l"
                                            role="menuitemradio"
                                            aria-checked={selected}
                                            className={styles.item}
                                            onClick={() => {
                                                if (section === 'speed') {
                                                    onSpeed(Number(item.value));
                                                } else {
                                                    onQuality(item.value);
                                                }
                                                setOpen(false);
                                            }}
                                        >
                                            <Flex
                                                alignItems="center"
                                                justifyContent="space-between"
                                                gap="3"
                                                className={styles.row}
                                            >
                                                <Text>{item.label}</Text>
                                                {selected && <Icon data={Check} size={16} />}
                                            </Flex>
                                        </Button>
                                    );
                                })}
                            </Flex>
                        </>
                    ) : (
                        <>
                            <Button
                                view="flat"
                                size="l"
                                className={styles.item}
                                role="menuitem"
                                onClick={() => setSection('speed')}
                            >
                                <Flex alignItems="center" gap="1" className={styles.row}>
                                    <Text color="secondary">{labels.speed}</Text>
                                    <Text className={styles.value}>{speed}×</Text>
                                    <Icon data={ChevronRight} size={16} />
                                </Flex>
                            </Button>
                            <Button
                                view="flat"
                                size="l"
                                className={styles.item}
                                role="menuitem"
                                onClick={() => setSection('quality')}
                            >
                                <Flex alignItems="center" gap="1" className={styles.row}>
                                    <Text color="secondary">{labels.quality}</Text>
                                    <Text className={styles.value}>
                                        {sources.find((source) => source.src === quality)?.label}
                                    </Text>
                                    <Icon data={ChevronRight} size={16} />
                                </Flex>
                            </Button>
                        </>
                    )}
                </Flex>
            </Popup>
        </>
    );
}
