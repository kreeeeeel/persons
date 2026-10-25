'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useFormatter } from 'next-intl';
import { Alert, Box, Button, Card, Flex, Label, Text } from '@gravity-ui/uikit';
import { LoadedAvatar, LoadedImage } from '@persons/ui';
import { useLocale, useTranslate } from '@persons/i18n';
import { signOut, revokeSession } from '@/modules/id/actions/id';
import type { AccountScreenProps } from '@/modules/account/screens/AccountScreen/AccountScreen.types';
import styles from '@/modules/account/screens/AccountScreen/AccountScreen.module.css';

export function AccountScreen({ user, sessions }: AccountScreenProps) {
    const t = useTranslate('id');
    const common = useTranslate('common');
    const locale = useLocale();
    const formatter = useFormatter();
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string>();

    function logout() {
        startTransition(async () => {
            const result = await signOut();

            if (result.ok) {
                router.replace(`/${locale}`);
                router.refresh();
            } else {
                setError(result.code);
            }
        });
    }

    return (
        <Flex direction="column" gap="6" className={styles.screen}>
            <Flex justifyContent="space-between" alignItems="center" gap="4" wrap>
                <Box>
                    <Text as="h1" variant="display-1">
                        {t('homeTitle', { name: user.firstName })}
                    </Text>
                    <Text as="p" variant="body-3">
                        {t('homeSubtitle')}
                    </Text>
                </Box>
                <Button size="xl" onClick={logout} loading={pending} disabled={pending}>
                    {common('logout')}
                </Button>
            </Flex>
            {error && <Alert theme="danger" message={t(error)} />}
            <Card id="profile" className={styles.card}>
                <Flex direction="column" gap="3">
                    <Text as="h2" variant="header-1">
                        {t('profile')}
                    </Text>
                    <LoadedAvatar
                        name={`${user.firstName} ${user.lastName}`}
                        src={user.hasAvatar ? '/api/avatar' : undefined}
                        size={80}
                    />
                    <Text variant="body-3">
                        {user.firstName} {user.lastName}
                    </Text>
                    <Text>{user.email}</Text>
                    {user.role === 'ADMIN' && (
                        <Button size="xl" href={`/admin/${locale}`}>
                            {t('admin')}
                        </Button>
                    )}
                    <Box>
                        <Label theme="info">{t(user.role === 'ADMIN' ? 'roleAdmin' : 'roleUser')}</Label>
                    </Box>
                </Flex>
            </Card>
            <Text as="h2" id="sessions" variant="header-1">
                {t('sessions')}
            </Text>
            {!sessions.length && (
                <Flex direction="column" alignItems="center" gap="3" className={styles.empty} role="status">
                    <LoadedImage
                        src="/media/empty-sessions-nikita-v1.webp"
                        alt={t('emptySessionsArt')}
                        width={144}
                        height={144}
                    />
                    <Text color="secondary">{t('noSessions')}</Text>
                </Flex>
            )}
            {sessions.map((session) => (
                <Card key={session.id} className={styles.card}>
                    <Flex justifyContent="space-between" alignItems="center" gap="4" wrap>
                        <Flex direction="column" gap="2">
                            <Text variant="subheader-2">
                                {session.browser || t('sessionUnknown')} · {session.os} {session.osVersion}
                            </Text>
                            <Text color="secondary">{t('sessionIp', { ip: session.ip || t('sessionUnknown') })}</Text>
                            <Text color="secondary">
                                {t('sessionDevice', { device: session.device || t('sessionUnknown') })}
                            </Text>
                            <Text color="secondary">
                                {t('sessionOrigin', { origin: session.origin || t('sessionUnknown') })}
                            </Text>
                            <Text color="secondary">
                                {t('sessionLastSeen', {
                                    date: formatter.dateTime(new Date(session.lastSeenAt), {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                    }),
                                })}
                            </Text>
                            <Text color="secondary">
                                {t('sessionCreated', {
                                    date: formatter.dateTime(new Date(session.createdAt), {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                    }),
                                })}
                            </Text>
                            {session.current && <Text color="brand">{t('currentSession')}</Text>}
                        </Flex>
                        <Button
                            size="l"
                            disabled={pending}
                            onClick={() =>
                                startTransition(async () => {
                                    const result = await revokeSession(session.id);

                                    if (result.ok) {
                                        if (session.current) {
                                            router.replace(`/${locale}`);
                                            router.refresh();
                                        } else {
                                            router.refresh();
                                        }
                                    } else {
                                        setError(result.code);
                                    }
                                })
                            }
                        >
                            {t('revoke')}
                        </Button>
                    </Flex>
                </Card>
            ))}
        </Flex>
    );
}
