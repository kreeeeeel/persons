'use client';

import { useCallback } from 'react';
import { Box, Button, Dialog, Flex, Icon, Text } from '@gravity-ui/uikit';
import { Display, LogoAndroid, LogoApple, LogoLinux, LogoMacos, LogoWindows } from '@gravity-ui/icons';
import { useLocale, useTranslate } from '@persons/i18n';
import { LoadErrorContext } from '@persons/ui/loading/LoadErrorContext';
import { personClient } from '@persons/person-domain/api/browser';
import { usePersonData } from '@persons/person-domain/hooks/usePersonData';
import { FeedContent } from '@persons/person-domain/FeedContent';
import type { UserSessionsDialogProps } from '@/modules/users/components/UserSessionsDialog/UserSessionsDialog.types';
import styles from '@/modules/users/components/UserSessionsDialog/UserSessionsDialog.module.css';

function deviceIcon(os: string) {
    const name = os.toLowerCase();
    if (name.includes('windows')) {
        return LogoWindows;
    }
    if (name.includes('android')) {
        return LogoAndroid;
    }
    if (name.includes('ios')) {
        return LogoApple;
    }
    if (name.includes('mac')) {
        return LogoMacos;
    }
    if (name.includes('linux')) {
        return LogoLinux;
    }
    return Display;
}

export function UserSessionsDialog({ userId, name, onClose }: UserSessionsDialogProps) {
    const t = useTranslate('admin');
    const account = useTranslate('account');
    const locale = useLocale();
    const load = useCallback(
        (signal: AbortSignal) => personClient.accounts.listUserSessions({ id: userId }, { signal }),
        [userId],
    );
    const resource = usePersonData(`user-sessions:${userId}`, load);
    const dates = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });

    return (
        <Dialog
            open
            maxWidth="m"
            fullWidth
            hasCloseButton
            contentOverflow="auto"
            onClose={onClose}
            aria-label={t('viewSessions')}
        >
            <Dialog.Header caption={t('viewSessions')} />
            <Dialog.Body>
                <LoadErrorContext value="dialog">
                    <Flex direction="column" gap="4">
                        <Text>{name}</Text>
                        <FeedContent
                            loading={resource.loading}
                            error={resource.error}
                            empty={resource.data?.items.length === 0}
                            emptyTitle={t('noActiveSessions')}
                            emptyDescription=""
                            illustration="sessions"
                            onRetry={resource.refresh}
                        >
                            <Flex direction="column" gap="3">
                                {resource.data?.items.map((session) => (
                                    <Flex key={session.id} gap="4" alignItems="flex-start" className={styles.session}>
                                        <Box className={styles.device} aria-hidden="true">
                                            <Icon data={deviceIcon(session.os || '')} size={28} />
                                        </Box>
                                        <Flex direction="column" gap="2" className={styles.details}>
                                            <Text variant="subheader-2">
                                                {account('sessionClient', {
                                                    client: session.browser || account('clientUnknown'),
                                                    os:
                                                        [session.os, session.osVersion].filter(Boolean).join(' ') ||
                                                        account('osUnknown'),
                                                })}
                                            </Text>
                                            <Text color="info" className={styles.ip}>
                                                {t('sessionIp', { ip: session.ip || t('unknownIp') })}
                                            </Text>
                                            {session.region && <Text color="secondary">{session.region}</Text>}
                                            {session.origin && (
                                                <Text color="secondary">
                                                    {t('sessionApplication', { application: session.origin })}
                                                </Text>
                                            )}
                                            <Text color="secondary">
                                                {t('sessionCreatedAt', { date: dates.format(session.createdAt) })}
                                            </Text>
                                            <Text color="secondary">
                                                {t('sessionLastSeenAt', { date: dates.format(session.lastSeenAt) })}
                                            </Text>
                                        </Flex>
                                    </Flex>
                                ))}
                            </Flex>
                        </FeedContent>
                        <Button size="l" view="flat" loading={resource.refreshing} onClick={resource.refresh}>
                            {t('refreshSessions')}
                        </Button>
                    </Flex>
                </LoadErrorContext>
            </Dialog.Body>
            <Dialog.Footer textButtonCancel={t('close')} onClickButtonCancel={onClose} />
        </Dialog>
    );
}
