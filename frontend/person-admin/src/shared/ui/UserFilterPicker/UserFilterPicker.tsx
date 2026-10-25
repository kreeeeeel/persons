'use client';
import { useCallback, useState } from 'react';
import { Button, Flex, Loader, Text, TextInput } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import { personClient } from '@persons/person-domain/api/browser';
import { usePersonData } from '@persons/person-domain/hooks/usePersonData';
import { IdentityCell } from '@/shared/ui/IdentityCell/IdentityCell';
import { EmptyState } from '@persons/person-domain/EmptyState';
import styles from '@/shared/ui/UserFilterPicker/UserFilterPicker.module.css';

export function UserFilterPicker({ onChange }: { readonly onChange: (id: string, label: string) => void }) {
    const t = useTranslate('cms');
    const [search, setSearch] = useState('');
    const load = useCallback(
        (signal: AbortSignal) => personClient.accounts.listAdminUsers({ search, page: 0, size: 50 }, { signal }),
        [search],
    );
    const resource = usePersonData(`filter-users:${search}`, load);

    return (
        <Flex direction="column" gap="3">
            <TextInput
                size="l"
                value={search}
                onUpdate={setSearch}
                placeholder={t('filterUser')}
                controlProps={{ 'aria-label': t('filterUser') }}
                hasClear
            />
            {resource.loading ? (
                <Loader size="m" />
            ) : resource.error ? (
                <Button onClick={resource.refresh}>{t('retry')}</Button>
            ) : (
                <Flex direction="column" className={styles.results}>
                    {resource.data?.items.map((user) => (
                        <Button
                            key={user.id}
                            size="xl"
                            view="flat"
                            className={styles.option}
                            onClick={() => onChange(user.id, `${user.firstName} ${user.lastName}`)}
                        >
                            <IdentityCell name={`${user.firstName} ${user.lastName}`} />
                            <Text color="secondary">{user.email}</Text>
                        </Button>
                    ))}
                    {!resource.data?.items.length && (
                        <EmptyState illustration="search" description={t('noResults')} compact />
                    )}
                </Flex>
            )}
        </Flex>
    );
}
