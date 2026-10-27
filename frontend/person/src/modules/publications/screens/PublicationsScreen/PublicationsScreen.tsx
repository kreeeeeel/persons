'use client';

import { useCallback, useState } from 'react';
import { Box, Flex, Text } from '@gravity-ui/uikit';
import type { PublicationKind, PublicAuthor } from '@persons/person-client';
import { AuthorIdentity } from '@persons/person-domain/AuthorIdentity';
import { useTranslate } from '@persons/i18n';
import { SegmentedTabs } from '@persons/ui/SegmentedTabs';
import { FeedContent } from '@persons/person-domain/FeedContent';
import { InfiniteFeedLoader } from '@persons/person-domain/InfiniteFeedLoader';
import { personClient } from '@persons/person-domain/api/browser';
import { useInfinitePersonData } from '@persons/person-domain/hooks/useInfinitePersonData';
import { useUploadEvents } from '@persons/person-domain/uploads/useUploadEvents';
import { FeedEventCard } from '@/modules/feed/components/FeedEventCard/FeedEventCard';
import { toPublicationEvent } from '@/modules/publications/model/toPublicationEvent';
import styles from '@/modules/publications/screens/PublicationsScreen/PublicationsScreen.module.css';

const KINDS = ['all', 'MOMENT', 'PHOTO', 'RATING', 'COMMENT', 'CREDIT'] as const;

export function PublicationsScreen({
    author,
    signedIn,
    handle,
}: {
    readonly author: PublicAuthor;
    readonly signedIn: boolean;
    readonly handle?: string;
}) {
    const t = useTranslate('publications');
    const [kind, setKind] = useState<PublicationKind | 'all'>('all');
    const load = useCallback(
        async (page: number, signal: AbortSignal) => {
            const options = {
                kind: kind === 'all' ? undefined : kind,
                page,
                size: 12,
            };
            const result = handle
                ? await personClient.publications.listAuthorPublications({ handle, ...options }, { signal })
                : await personClient.publications.listMyPublications(
                      {
                          kind: kind === 'all' ? undefined : kind,
                          page,
                          size: 12,
                      },
                      { signal },
                  );
            return { ...result, items: result.items.map(toPublicationEvent) };
        },
        [kind, handle],
    );
    const resource = useInfinitePersonData(`publications:${author.id}:${handle ?? 'mine'}:${kind}`, load);
    useUploadEvents(undefined, resource.refresh);
    const filtered = kind !== 'all';
    return (
        <Flex direction="column" gap="5" className={styles.root}>
            <Box className={styles.heading}>
                <AuthorIdentity author={author} centered />
            </Box>
            <Flex direction="column" gap="4" alignItems="center" className={styles.filters}>
                <SegmentedTabs
                    value={kind}
                    label={t('filters')}
                    items={KINDS.map((value) => ({ value, label: t(value) }))}
                    onUpdate={(value) => {
                        const selected = KINDS.find((item) => item === value);
                        if (selected) {
                            setKind(selected);
                        }
                    }}
                />
            </Flex>
            <FeedContent
                loading={resource.loading}
                error={resource.error}
                empty={!resource.data?.items.length}
                emptyTitle={t(filtered ? 'filteredEmptyTitle' : 'emptyTitle')}
                emptyDescription={t(filtered ? 'filteredEmptyDescription' : 'emptyDescription')}
                illustration="publications"
                onRetry={resource.refresh}
            >
                <Flex direction="column" gap="5" aria-label={t('title')}>
                    {resource.data?.items.map((event) => (
                        <FeedEventCard key={event.id} event={event} signedIn={signedIn} onChanged={resource.refresh} />
                    ))}
                </Flex>
            </FeedContent>
            <InfiniteFeedLoader {...resource} />
            {!resource.loading && !resource.error && !resource.hasMore && !!resource.data?.items.length && (
                <Text as="p" color="secondary" className={styles.end}>
                    {t('end')}
                </Text>
            )}
        </Flex>
    );
}
