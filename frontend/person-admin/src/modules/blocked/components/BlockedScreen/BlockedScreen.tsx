'use client';
import { ActionTable } from '@/shared/ui/ActionTable/ActionTable';
import { useCallback, useState } from 'react';
import { Flex, Label, Text } from '@gravity-ui/uikit';
import { SegmentedTabs } from '@persons/ui/SegmentedTabs';
import { useLocale, useTranslate } from '@persons/i18n';
import { personClient, mediaHref } from '@persons/person-domain/api/browser';
import { useInfinitePersonData } from '@persons/person-domain/hooks/useInfinitePersonData';
import { usePersonMutation } from '@persons/person-domain/hooks/usePersonMutation';
import { InfiniteFeedLoader } from '@persons/person-domain/InfiniteFeedLoader';
import { MutationFeedback } from '@persons/person-domain/MutationFeedback';
import { UserRestrictionDialog } from '@persons/person-domain/UserRestrictionDialog';
import { PageRestrictionsDialog } from '@/modules/users/components/PageRestrictionsDialog/PageRestrictionsDialog';
import { ListPageHeader } from '@/shared/ui/ListPageHeader/ListPageHeader';
import { ListFilterBar } from '@/shared/ui/ListFilterBar/ListFilterBar';
import { ListTable } from '@/shared/ui/ListTable/ListTable';
import { IdentityCell } from '@/shared/ui/IdentityCell/IdentityCell';
import type { BlockedRow } from '@/modules/blocked/components/BlockedScreen/BlockedScreen.types';

export function BlockedScreen({ publicUrl }: { readonly publicUrl: string }) {
    const t = useTranslate('cms');
    const person = useTranslate('person');
    const locale = useLocale();
    const [mode, setMode] = useState('SITE');
    const [search, setSearch] = useState('');
    const [user, setUser] = useState({ id: '', name: '' });
    const load = useCallback(
        async (page: number, signal: AbortSignal) => {
            const params = { page, size: 20, q: search || undefined, userId: user.id || undefined };
            if (mode === 'SITE') {
                const result = await personClient.restrictions.listBlockedUsers(params, { signal });
                return {
                    ...result,
                    items: result.items.map((item) => ({
                        ...item,
                        personId: undefined,
                        personTag: undefined,
                        personName: undefined,
                        personAvatarMediaId: undefined,
                    })),
                };
            }
            return personClient.pageRestrictions.listActivePageRestrictions(params, { signal });
        },
        [mode, search, user.id],
    );
    const resource = useInfinitePersonData(`blocked:${mode}:${search}:${user.id}`, load);
    const mutation = usePersonMutation();
    const [editing, setEditing] = useState<{ id: string; name: string; mode: string }>();
    const dates = new Intl.DateTimeFormat(locale, {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Europe/Moscow',
    });
    return (
        <Flex direction="column" gap="5">
            <ListPageHeader title={t('blocked')} description={t('blockedDescription')} />
            <Flex>
                <SegmentedTabs
                    value={mode}
                    onUpdate={setMode}
                    label={t('restrictionLocation')}
                    items={[
                        { value: 'SITE', label: t('siteRestrictions') },
                        { value: 'PAGE', label: t('pageRestrictions') },
                    ]}
                />
            </Flex>
            <ListFilterBar
                search={search}
                onSearch={setSearch}
                placeholder={t('reason')}
                fields={[
                    {
                        key: 'user',
                        label: t('user'),
                        type: 'user',
                        value: user.id,
                        valueLabel: user.name,
                        onChange: (id, name) => setUser({ id, name: name ?? '' }),
                    },
                ]}
            />
            <MutationFeedback {...mutation} />
            <ListTable
                title={t('blocked')}
                loading={resource.loading}
                error={resource.error}
                retry={resource.refresh}
                empty={!resource.data?.items.length}
                emptyTitle={t('noBlocked')}
                emptyDescription={t('noBlockedDescription')}
                illustration="restrictions"
            >
                <ActionTable<BlockedRow>
                    data={resource.data?.items ?? []}
                    label={(item) => item.userName || item.userId}
                    disabled={mutation.pending}
                    actions={(item) => [
                        {
                            text: person('edit'),
                            action: () => setEditing({ id: item.userId, name: item.userName || '', mode }),
                        },
                        {
                            text: t('removeRestriction'),
                            theme: 'danger',
                            action: () =>
                                mutation.run(
                                    () =>
                                        mode === 'SITE'
                                            ? personClient.restrictions.revokeUserRestriction({
                                                  id: item.userId,
                                              })
                                            : personClient.pageRestrictions.revokePageRestriction({
                                                  id: item.userId,
                                                  restrictionId: item.id,
                                              }),
                                    resource.refresh,
                                    false,
                                ),
                        },
                    ]}
                    columns={[
                        {
                            id: 'user',
                            name: t('user'),
                            width: '24%',
                            template: (item) => (
                                <IdentityCell
                                    name={item.userName || '—'}
                                    tag={item.userTag}
                                    avatar={item.userAvatarUrl}
                                />
                            ),
                        },
                        {
                            id: 'page',
                            name: t('page'),
                            width: '24%',
                            template: (item) =>
                                item.personTag ? (
                                    <IdentityCell
                                        name={item.personName || ''}
                                        tag={item.personTag}
                                        avatar={
                                            item.personAvatarMediaId ? mediaHref(item.personAvatarMediaId) : undefined
                                        }
                                        href={new URL(`/${locale}/person/${item.personTag}`, publicUrl).href}
                                    />
                                ) : (
                                    <Label>{t('allSite')}</Label>
                                ),
                        },
                        {
                            id: 'reason',
                            name: t('reason'),
                            width: '30%',
                            template: (item) => (
                                <Flex direction="column" gap="2">
                                    <Text>{item.reason}</Text>
                                    <Flex gap="2" wrap>
                                        {[...item.scopes].map((scope) => (
                                            <Label key={scope} theme="warning">
                                                {person(`scope${scope}`)}
                                            </Label>
                                        ))}
                                    </Flex>
                                </Flex>
                            ),
                        },
                        {
                            id: 'until',
                            name: t('until'),
                            template: (item) => (
                                <Text color="secondary">
                                    {item.expiresAt ? dates.format(item.expiresAt) : t('forever')}
                                </Text>
                            ),
                        },
                    ]}
                />
            </ListTable>
            <InfiniteFeedLoader {...resource} />
            {editing &&
                (editing.mode === 'SITE' ? (
                    <UserRestrictionDialog
                        userId={editing.id}
                        name={editing.name}
                        onClose={() => setEditing(undefined)}
                        onSaved={resource.refresh}
                    />
                ) : (
                    <PageRestrictionsDialog
                        userId={editing.id}
                        name={editing.name}
                        publicUrl={publicUrl}
                        onClose={() => setEditing(undefined)}
                        onSaved={resource.refresh}
                    />
                ))}
        </Flex>
    );
}
