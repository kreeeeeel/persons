'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Box, Button, Flex, Text } from '@gravity-ui/uikit';
import { LoadedImage } from '@persons/ui';
import { AppLink } from '@persons/ui/AppLink';
import { useLocale, useTranslate } from '@persons/i18n';
import {
    COOKIE_PREFERENCE_CHANGED,
    COOKIE_PREFERENCE_OPEN,
    readCookiePreference,
} from '@/shared/privacy/cookiePreferences';
import styles from '@/shared/ui/CookieNotice/CookieNotice.module.css';

const serverPreference = () => undefined;
const clientReady = () => true;
const serverReady = () => false;
const subscribeReady = () => () => undefined;
function subscribe(listener: () => void) {
    window.addEventListener(COOKIE_PREFERENCE_CHANGED, listener);
    window.addEventListener('focus', listener);
    return () => {
        window.removeEventListener(COOKIE_PREFERENCE_CHANGED, listener);
        window.removeEventListener('focus', listener);
    };
}

export function CookieNotice() {
    const t = useTranslate('cookies');
    const locale = useLocale();
    const preference = useSyncExternalStore(subscribe, readCookiePreference, serverPreference);
    const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
    const [opened, setOpened] = useState(false);
    const [pending, setPending] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const open = () => setOpened(true);
        window.addEventListener(COOKIE_PREFERENCE_OPEN, open);
        return () => window.removeEventListener(COOKIE_PREFERENCE_OPEN, open);
    }, []);

    async function choose(choice: 'accepted' | 'rejected') {
        setPending(true);
        setFailed(false);
        try {
            const response = await fetch('/api/cookie-preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ choice }),
            });
            if (!response.ok) {
                throw new Error('Cookie preference could not be saved');
            }
            window.dispatchEvent(new Event(COOKIE_PREFERENCE_CHANGED));
            setOpened(false);
        } catch {
            setFailed(true);
        } finally {
            setPending(false);
        }
    }

    if (preference && !opened) {
        return null;
    }

    return (
        <Box as="section" aria-label={t('label')} className={styles.notice}>
            <Box className={styles.art}>
                <LoadedImage
                    src="/media/cookies-vadim-v1.webp"
                    alt={t('illustration')}
                    width={112}
                    height={112}
                    responsive
                />
            </Box>
            <Flex direction="column" gap="2" className={styles.copy}>
                <Text as="p" className={styles.description}>
                    {t('description')} <AppLink href={`/${locale}/privacy#cookies`}>{t('details')}</AppLink>
                </Text>
                {failed && (
                    <Text color="danger" role="alert" className={styles.error}>
                        {t('error')}
                    </Text>
                )}
            </Flex>
            <Flex gap="3" className={styles.actions}>
                <Button
                    size="l"
                    className={styles.choice}
                    view="action"
                    disabled={pending || !ready}
                    onClick={() => void choose('accepted')}
                >
                    {t('accept')}
                </Button>
                <Button
                    size="l"
                    className={styles.choice}
                    view="flat"
                    disabled={pending || !ready}
                    onClick={() => void choose('rejected')}
                >
                    {t('reject')}
                </Button>
            </Flex>
        </Box>
    );
}
