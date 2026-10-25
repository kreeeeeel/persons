'use client';
import { ActionTable } from '@/shared/ui/ActionTable/ActionTable';

import { useCallback, useState, useTransition } from 'react';
import { Alert, Box, Flex, Label, Text } from '@gravity-ui/uikit';
import { ListPageHeader } from '@/shared/ui/ListPageHeader/ListPageHeader';
import { ListFilterBar } from '@/shared/ui/ListFilterBar/ListFilterBar';
import { useTranslate } from '@persons/i18n';
import { LoadedAvatar } from '@persons/ui';
import { personClient } from '@persons/person-domain/api/browser';
import { useInfinitePersonData } from '@persons/person-domain/hooks/useInfinitePersonData';
import { InfiniteFeedLoader } from '@persons/person-domain/InfiniteFeedLoader';
import { FeedContent } from '@persons/person-domain/FeedContent';
import { UserRestrictionDialog } from '@persons/person-domain/UserRestrictionDialog';
import { AccessDialog } from '@/modules/users/components/AccessDialog/AccessDialog';
import { PageRestrictionsDialog } from '@/modules/users/components/PageRestrictionsDialog/PageRestrictionsDialog';
import { UserProfileDialog } from '@/modules/users/components/UserProfileDialog/UserProfileDialog';
import { UserSessionsDialog } from '@/modules/users/components/UserSessionsDialog/UserSessionsDialog';
import { UserModerationDialog } from '@/modules/users/components/UserModerationDialog/UserModerationDialog';
import { revokeSessions } from '@/modules/users/actions/access';
import type { BrowserAdminUser } from '@/modules/users/model/BrowserAdminUser';
import type { UsersScreenProps } from '@/modules/users/screens/UsersScreen/UsersScreen.types';
import styles from '@/modules/users/screens/UsersScreen/UsersScreen.module.css';

const PAGE_SIZE = 20;

export function UsersScreen({ search: initialSearch, publicUrl }: UsersScreenProps) {
    const t = useTranslate('admin');
    const cms = useTranslate('cms');
    const [search, setSearch] = useState(initialSearch);
    const [profileUser, setProfileUser] = useState<BrowserAdminUser>();
    const [sessionUser, setSessionUser] = useState<BrowserAdminUser>();
    const [pageRestricted, setPageRestricted] = useState<BrowserAdminUser>();
    const [restricted, setRestricted] = useState<BrowserAdminUser>();
    const [moderatedUser, setModeratedUser] = useState<BrowserAdminUser>();
    const [selected, setSelected] = useState<BrowserAdminUser>();
    const [error, setError] = useState<string>();
    const [notice, setNotice] = useState(false);
    const [pending, startTransition] = useTransition();

    const load = useCallback(
        async (page: number, signal: AbortSignal) => {
            const result = await personClient.accounts.listAdminUsers({ page, size: PAGE_SIZE, search }, { signal });
            return {
                ...result,
                items: result.items.map((user) => ({ ...user, createdAt: user.createdAt.toISOString() })),
            };
        },
        [search],
    );
    const resource = useInfinitePersonData(`users:${search}`, load);
    const users = resource.data?.items ?? [];

    return (
        <Flex direction="column" gap="5" className={styles.screen}>
            <ListPageHeader title={t('users')} description={cms('usersDescription')} total={resource.data?.total} />
            {error && <Alert theme="danger" message={t(error)} />}
            {notice && <Alert theme="success" message={t('sessionsRevoked')} onClose={() => setNotice(false)} />}
            <ListFilterBar search={search} onSearch={setSearch} placeholder={t('search')} />
            <FeedContent
                loading={resource.loading}
                error={resource.error}
                retainContentOnError={resource.data !== undefined}
                empty={users.length === 0}
                emptyTitle={t('empty')}
                emptyDescription=""
                illustration="search"
                onRetry={resource.refresh}
            >
                <Box className={styles.table} aria-busy={resource.refreshing}>
                    <ActionTable
                        data={[...users]}
                        label={(user) => `${user.firstName} ${user.lastName}`}
                        disabled={pending}
                        actions={(user) => [
                            { text: t('editProfile'), action: () => setProfileUser(user) },
                            { text: t('viewSessions'), action: () => setSessionUser(user) },
                            { text: t('moderation'), action: () => setModeratedUser(user) },
                            { text: t('siteRestrictions'), action: () => setRestricted(user) },
                            { text: t('pageRestrictions'), action: () => setPageRestricted(user) },
                            { text: t('editAccess'), action: () => setSelected(user) },
                            {
                                text: t('revokeSessions'),
                                action: () =>
                                    startTransition(async () => {
                                        setError(undefined);
                                        setNotice(false);
                                        const result = await revokeSessions(user.id);
                                        if (result.ok) {
                                            setNotice(true);
                                        } else {
                                            setError(result.code);
                                        }
                                    }),
                            },
                        ]}
                        columns={[
                            {
                                id: 'name',
                                width: 360,
                                className: styles.cell,
                                name: t('name'),
                                template: (user) => (
                                    <Flex alignItems="center" gap="3" className={styles.identity}>
                                        <LoadedAvatar
                                            name={`${user.firstName} ${user.lastName}`}
                                            src={`/api/users/${encodeURIComponent(user.id)}/avatar`}
                                            size={40}
                                            className={styles.avatar}
                                        />
                                        <Flex direction="column" gap="2" className={styles.details}>
                                            <Text variant="subheader-2">
                                                {user.firstName} {user.lastName}
                                            </Text>
                                            <Text color="secondary">{user.email}</Text>
                                        </Flex>
                                    </Flex>
                                ),
                            },
                            {
                                id: 'role',
                                width: 180,
                                className: styles.cell,
                                name: t('role'),
                                template: (user) => (
                                    <Label theme={user.role === 'ADMIN' ? 'info' : 'normal'}>{t(user.role)}</Label>
                                ),
                            },
                            {
                                id: 'status',
                                width: 200,
                                className: styles.cell,
                                name: t('status'),
                                template: (user) => (
                                    <Flex direction="column" gap="2" alignItems="flex-start">
                                        <Label theme={user.status === 'ACTIVE' ? 'success' : 'danger'}>
                                            {t(user.status)}
                                        </Label>
                                        {user.restriction && <Label theme="warning">{t('restrictions')}</Label>}
                                    </Flex>
                                ),
                            },
                        ]}
                    />
                </Box>
            </FeedContent>
            <InfiniteFeedLoader {...resource} />
            {profileUser && (
                <UserProfileDialog
                    user={profileUser}
                    onClose={() => setProfileUser(undefined)}
                    onSaved={() => {
                        setProfileUser(undefined);
                        resource.refresh();
                    }}
                />
            )}
            {sessionUser && (
                <UserSessionsDialog
                    userId={sessionUser.id}
                    name={`${sessionUser.firstName} ${sessionUser.lastName}`}
                    onClose={() => setSessionUser(undefined)}
                />
            )}
            {pageRestricted && (
                <PageRestrictionsDialog
                    userId={pageRestricted.id}
                    name={`${pageRestricted.firstName} ${pageRestricted.lastName}`}
                    publicUrl={publicUrl}
                    onClose={() => setPageRestricted(undefined)}
                    onSaved={resource.refresh}
                />
            )}
            {restricted && (
                <UserRestrictionDialog
                    userId={restricted.id}
                    name={`${restricted.firstName} ${restricted.lastName}`}
                    onClose={() => setRestricted(undefined)}
                    onSaved={() => {
                        setRestricted(undefined);
                        resource.refresh();
                    }}
                />
            )}
            {selected && (
                <AccessDialog
                    user={selected}
                    onClose={() => setSelected(undefined)}
                    onSaved={() => {
                        setSelected(undefined);
                        resource.refresh();
                    }}
                />
            )}
            {moderatedUser && (
                <UserModerationDialog
                    userId={moderatedUser.id}
                    name={`${moderatedUser.firstName} ${moderatedUser.lastName}`}
                    onClose={() => setModeratedUser(undefined)}
                />
            )}
        </Flex>
    );
}
