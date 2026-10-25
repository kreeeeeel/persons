'use client';

import { useCallback } from 'react';
import { Box, Button, Flex, Icon, Skeleton, Text } from '@gravity-ui/uikit';
import { ArrowRight } from '@gravity-ui/icons';
import { AppLink } from '@persons/ui/AppLink';
import { useLocale, useTranslate } from '@persons/i18n';
import { LoadedAvatar } from '@persons/ui';
import { EmptyState } from '@persons/person-domain/EmptyState';
import { mediaHref, personClient } from '@persons/person-domain/api/browser';
import { usePersonData } from '@persons/person-domain/hooks/usePersonData';
import styles from '@/modules/feed/components/FeedSidebar/FeedSidebar.module.css';

export function FeedSidebar({ ownPageId }: { readonly ownPageId?: string }) {
    const locale = useLocale();
    const t = useTranslate('feed');
    const person = useTranslate('person');
    const load = useCallback(
        async (signal: AbortSignal) => personClient.persons.recommendPersons({ size: 5 }, { signal }),
        [],
    );
    const resource = usePersonData('feed-recommendations', load);
    const people = resource.data?.filter((page) => page.id !== ownPageId) ?? [];
    return (
        <Box as="aside" className={styles.sidebar} aria-label={t('recommendations')}>
            <Text as="h2" className={styles.title}>
                {t('recommendations')}
            </Text>
            <Text as="p" color="secondary" className={styles.hint}>
                {t('recommendationsHint')}
            </Text>
            <Box className={styles.people}>
                {resource.loading && [0, 1, 2].map((key) => <Skeleton key={key} className={styles.skeleton} />)}
                {resource.error && (
                    <Flex direction="column" gap="3" role="alert">
                        <Text color="secondary">{person(resource.error)}</Text>
                        <Button view="flat" size="l" onClick={resource.refresh}>
                            {person('retry')}
                        </Button>
                    </Flex>
                )}
                {!resource.loading && !resource.error && !people.length && (
                    <EmptyState illustration="search" description={t('noRecommendations')} compact />
                )}
                {people.map((page) => (
                    <AppLink key={page.id} href={`/${locale}/person/${page.tag}`} className={styles.person}>
                        <LoadedAvatar
                            name={page.fullName}
                            src={page.avatarMediaId ? mediaHref(page.avatarMediaId) : undefined}
                            size={40}
                        />
                        <Flex direction="column" gap="1" className={styles.identity}>
                            <Text className={styles.name}>{page.fullName}</Text>
                            <Text color="secondary">@{page.tag}</Text>
                        </Flex>
                        <Icon data={ArrowRight} size={16} />
                    </AppLink>
                ))}
            </Box>
            <AppLink href={`/${locale}/people`} className={styles.more}>
                {t('morePeople')} <Icon data={ArrowRight} size={16} />
            </AppLink>
        </Box>
    );
}
