'use client';

import { useCallback, useState } from 'react';
import { Box, Flex, Select, Text } from '@gravity-ui/uikit';
import type { PersonSummary } from '@persons/person-client';
import { useTranslate } from '@persons/i18n';
import { FeedContent } from '@persons/person-domain/FeedContent';
import { InfiniteFeedLoader } from '@persons/person-domain/InfiniteFeedLoader';
import { personClient } from '@persons/person-domain/api/browser';
import { useInfinitePersonData } from '@persons/person-domain/hooks/useInfinitePersonData';
import { useUploadEvents } from '@persons/person-domain/uploads/useUploadEvents';
import { useUploadQueue } from '@persons/person-domain/uploads/UploadQueueContext';
import { FeedComposer } from '@/modules/feed/components/FeedComposer/FeedComposer';
import { FeedEventCard } from '@/modules/feed/components/FeedEventCard/FeedEventCard';
import { FeedSidebar } from '@/modules/feed/components/FeedSidebar/FeedSidebar';
import { loadFeedPage } from '@/modules/feed/model/loadFeedPage';
import { feedFileKind } from '@/modules/feed/model/feedFiles';
import type { FeedKind } from '@/modules/feed/model/FeedEvent';
import styles from '@/modules/feed/screens/FeedScreen/FeedScreen.module.css';

const KINDS = ['all', 'wall', 'comment', 'photo', 'moment', 'rating', 'loan', 'achievement', 'game'] as const;

export function FeedScreen({ ownPage }: { readonly ownPage?: PersonSummary }) {
    const t = useTranslate('feed');
    const [kind, setKind] = useState<FeedKind | 'all'>('all');
    const [target, setTarget] = useState(ownPage);
    const queue = useUploadQueue();
    const load = useCallback((page: number, signal: AbortSignal) => loadFeedPage(page, kind, signal), [kind]);
    const resource = useInfinitePersonData(`feed:${kind}`, load);
    useUploadEvents(undefined, resource.refresh);

    async function publish(text: string, files: readonly File[]) {
        if (!target) {
            throw new Error('A publication needs a page and a session');
        }
        if (files.length) {
            queue.enqueue(
                files.map((file) => ({
                    personId: target.id,
                    kind: feedFileKind(file) === 'photo' ? ('PHOTO' as const) : ('MOMENT' as const),
                    file,
                    caption: text,
                    taggedPersonIds: [],
                })),
            );
        } else {
            await personClient.interactions.createComment({ id: target.id, commentInput: { text } });
        }
        setKind('all');
        resource.refresh();
    }

    return (
        <Box className={styles.layout}>
            <FeedSidebar ownPageId={ownPage?.id} />
            <Flex direction="column" gap="5" className={styles.content}>
                <Box className={styles.heading}>
                    <Text as="h1" className={styles.title}>
                        {t('title')}
                    </Text>
                    <Text as="p" className={styles.intro}>
                        {t('intro')}
                    </Text>
                </Box>
                <FeedComposer onPublish={publish} target={target} ownPage={ownPage} onTargetChange={setTarget} />
                <Select
                    view="clear"
                    size="l"
                    className={styles.filter}
                    value={[kind]}
                    aria-label={t('filter')}
                    options={KINDS.map((value) => ({ value, content: t(value) }))}
                    onUpdate={([value]) => {
                        const next = KINDS.find((item) => item === value);
                        if (next) {
                            setKind(next);
                        }
                    }}
                />
                <FeedContent
                    loading={resource.loading}
                    error={resource.error}
                    empty={!resource.data?.items.length}
                    emptyTitle={t('emptyTitle')}
                    emptyDescription={t('emptyDescription')}
                    illustration="wall"
                    onRetry={resource.refresh}
                >
                    <Flex direction="column" gap="5" aria-label={t('title')}>
                        {resource.data?.items.map((event) => (
                            <FeedEventCard key={event.id} event={event} signedIn onChanged={resource.refresh} />
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
        </Box>
    );
}
