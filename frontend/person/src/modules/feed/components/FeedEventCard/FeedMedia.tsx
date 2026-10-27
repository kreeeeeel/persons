'use client';

import { useCallback, useState } from 'react';
import { Flex, Icon, Skeleton, Text } from '@gravity-ui/uikit';
import type { PersonSummary } from '@persons/person-client';
import { Comment as CommentIcon, Eye } from '@gravity-ui/icons';
import { useLocale, useTranslate } from '@persons/i18n';
import { compactCount } from '@persons/person-domain/format/compactCount';
import { ContentTime } from '@persons/person-domain/ContentTime';
import { FeedContent } from '@persons/person-domain/FeedContent';
import { MediaCard } from '@persons/person-domain/MediaCard';
import { MediaReactions } from '@persons/person-domain/MediaReactions';
import { MediaViewer } from '@persons/person-domain/MediaViewer';
import { personClient } from '@persons/person-domain/api/browser';
import { usePersonData } from '@persons/person-domain/hooks/usePersonData';
import { FeedPublicationHeader } from '@/modules/feed/components/FeedEventCard/FeedPublicationHeader';
import styles from '@/modules/feed/components/FeedEventCard/FeedEventCard.module.css';

export function FeedMedia({
    page,
    mediaId: id,
    kind,
    signedIn,
    onChanged,
}: {
    readonly page: PersonSummary;
    readonly mediaId: string;
    readonly kind: 'PHOTO' | 'MOMENT';
    readonly signedIn: boolean;
    readonly onChanged: () => void;
}) {
    const t = useTranslate('person');
    const feed = useTranslate('feed');
    const locale = useLocale();
    const [selected, setSelected] = useState<string>();
    const load = useCallback((signal: AbortSignal) => personClient.gallery.getMediaDetail({ id }, { signal }), [id]);
    const resource = usePersonData(`feed-media:${id}`, load);
    const detail = resource.data;
    function refresh() {
        resource.refresh();
        onChanged();
    }
    return (
        <>
            <FeedContent
                loading={resource.loading}
                error={resource.error}
                empty={false}
                emptyTitle=""
                emptyDescription=""
                onRetry={resource.refresh}
                skeleton={<Skeleton className={styles.mediaSkeleton} />}
            >
                {detail && (
                    <>
                        <FeedPublicationHeader
                            page={page}
                            author={{ ...detail, authorName: detail.authorName || t('unknownAuthor') }}
                            metadata={
                                <Flex gap="3" alignItems="center" className={styles.stats}>
                                    <Flex gap="2" alignItems="center">
                                        <Icon data={Eye} size={14} />
                                        <Text
                                            aria-label={t('mediaViews', {
                                                count: detail.views ?? 0,
                                            })}
                                        >
                                            {compactCount(detail.views ?? 0, locale)}
                                        </Text>
                                    </Flex>
                                    <Flex gap="2" alignItems="center">
                                        <Icon data={CommentIcon} size={14} />
                                        <Text aria-label={feed('commentsCount', { count: detail.comments })}>
                                            {compactCount(detail.comments, locale)}
                                        </Text>
                                    </Flex>
                                </Flex>
                            }
                        />
                        <MediaCard
                            item={{
                                id: detail.id,
                                mediaId: detail.id,
                                title: detail.caption,
                                createdAt: detail.createdAt,
                                canRemove: detail.canRemove,
                                views: detail.views,
                                durationSeconds: detail.durationSeconds,
                                previewAvailable: detail.previewAvailable,
                                moderationStatus: detail.moderationStatus,
                            }}
                            kind={kind}
                            onOpen={() => setSelected(id)}
                            showViews={false}
                        />
                        <Flex gap="3" alignItems="center" justifyContent="space-between" wrap className={styles.footer}>
                            {detail.canInteract !== false && (
                                <MediaReactions
                                    key={`${id}:${detail.reactions.likes}:${detail.reactions.dislikes}:${detail.reactions.reaction}`}
                                    mediaId={id}
                                    initial={detail.reactions}
                                    signedIn={signedIn}
                                />
                            )}
                            <ContentTime date={detail.createdAt} className={styles.date} />
                        </Flex>
                    </>
                )}
            </FeedContent>
            {selected && (
                <MediaViewer
                    mediaId={selected}
                    personId={page.id}
                    personTag={page.tag}
                    kind={kind}
                    signedIn={signedIn}
                    onClose={() => {
                        setSelected(undefined);
                        refresh();
                    }}
                    onNavigate={setSelected}
                    onChanged={refresh}
                />
            )}
        </>
    );
}
