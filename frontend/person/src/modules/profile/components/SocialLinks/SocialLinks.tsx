'use client';

import { useState } from 'react';
import { Alert, Button, ClipboardButton, Flex, Text } from '@gravity-ui/uikit';
import type { SocialLink } from '@persons/person-client';
import { useTranslate } from '@persons/i18n';
import { LoadedImage } from '@persons/ui';
import styles from '@/modules/profile/components/SocialLinks/SocialLinks.module.css';

const NETWORK_NAMES = { TELEGRAM: 'Telegram', STEAM: 'Steam', DISCORD: 'Discord' };

export function SocialLinks({ links }: { readonly links: readonly SocialLink[] }) {
    const t = useTranslate('person');
    const [copyFailed, setCopyFailed] = useState(false);
    return (
        <Flex direction="column" alignItems="flex-start" gap="3">
            <Flex gap="3" wrap justifyContent="flex-start" className={styles.links}>
                {links.map(({ network, url, tag }) => {
                    const icon = (
                        <LoadedImage
                            src={`/media/social-${network.toLowerCase()}.svg`}
                            alt=""
                            width={22}
                            height={22}
                            className={styles.icon}
                        />
                    );
                    if (network === 'DISCORD' && tag) {
                        return (
                            <ClipboardButton
                                key={network}
                                text={tag}
                                size="xl"
                                view="normal"
                                icon={icon}
                                className={styles.button}
                                aria-label={t('discordContact', { tag })}
                                tooltipInitialText={t('copyDiscordTag')}
                                tooltipSuccessText={t('discordTagCopied')}
                                onCopy={(_, success) => setCopyFailed(!success)}
                            >
                                <Text className={styles.contact}>{t('discordContact', { tag })}</Text>
                            </ClipboardButton>
                        );
                    }
                    if (!url) {
                        return null;
                    }
                    return (
                        <Button
                            key={network}
                            size="xl"
                            view="normal"
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.button}
                        >
                            <Flex alignItems="center" gap="2">
                                {icon}
                                <Text>{NETWORK_NAMES[network]}</Text>
                            </Flex>
                        </Button>
                    );
                })}
            </Flex>
            {copyFailed && <Alert theme="warning" message={t('discordCopyFailed')} />}
        </Flex>
    );
}
