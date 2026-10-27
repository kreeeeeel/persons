'use client';

import { ContentText } from '@persons/person-domain/ContentText';

import { Box, Flex, Label, Text } from '@gravity-ui/uikit';
import { useState } from 'react';
import { DotaMatchCard } from '@/modules/integrations/components/DotaMatchCard/DotaMatchCard';
import { DotaMatchDialog } from '@/modules/integrations/components/DotaMatchDialog/DotaMatchDialog';
import { CsMatchCard } from '@/modules/integrations/components/CsMatchCard/CsMatchCard';
import { CsMatchDialog } from '@/modules/integrations/components/CsMatchDialog/CsMatchDialog';
import { AppLink } from '@persons/ui/AppLink';
import { LoadedImage } from '@persons/ui';
import { useLocale, useTranslate } from '@persons/i18n';
import { ContentLike } from '@persons/person-domain/ContentLike';
import { ContentTime } from '@persons/person-domain/ContentTime';
import { CreditEntryContent } from '@persons/person-domain/CreditEntryContent';
import { PersonIdentity } from '@persons/person-domain/PersonIdentity';
import { RatingValue } from '@persons/person-domain/RatingValue';
import type { FeedEvent } from '@/modules/feed/model/FeedEvent';
import { FeedMedia } from '@/modules/feed/components/FeedEventCard/FeedMedia';
import { FeedPublicationHeader } from '@/modules/feed/components/FeedEventCard/FeedPublicationHeader';
import { FeedGameHeader } from '@/modules/feed/components/FeedEventCard/FeedGameHeader';
import { MediaCommentCard } from '@/modules/feed/components/MediaCommentCard/MediaCommentCard';
import styles from '@/modules/feed/components/FeedEventCard/FeedEventCard.module.css';

export function FeedEventCard({
    event,
    signedIn,
    onChanged,
}: {
    readonly event: FeedEvent;
    readonly signedIn: boolean;
    readonly onChanged: () => void;
}) {
    const t = useTranslate('feed');
    const person = useTranslate('person');
    const locale = useLocale();
    const [matchOpen, setMatchOpen] = useState(false);
    const pending =
        (event.kind === 'wall' || event.kind === 'comment' || event.kind === 'loan') &&
        event.content.moderationStatus === 'PENDING';
    const contextId =
        event.kind === 'wall' || event.kind === 'comment'
            ? (event.content.mediaId ?? event.content.momentId)
            : undefined;
    const contextKind = event.kind === 'wall' || event.kind === 'comment' ? event.contextMediaKind : undefined;
    if ((event.kind === 'wall' || event.kind === 'comment') && contextId && contextKind) {
        return (
            <MediaCommentCard
                comment={event.content}
                page={event.page}
                mediaId={contextId}
                kind={contextKind === 'MOMENT' ? 'MOMENT' : 'PHOTO'}
                signedIn={signedIn}
                onChanged={onChanged}
            />
        );
    }
    const displayKind = event.kind;
    return (
        <Box
            as="article"
            className={styles.card}
            aria-label={`${t(displayKind)} · ${event.page.fullName}`}
            data-kind={displayKind}
            data-created-at={event.createdAt.toISOString()}
        >
            {event.kind === 'game' && (
                <>
                    <FeedGameHeader page={event.page} playedAt={event.createdAt} game={event.game} />
                    {event.game === 'cs2' ? (
                        <>
                            <CsMatchCard match={event.content} onOpen={() => setMatchOpen(true)} />
                            {matchOpen && (
                                <CsMatchDialog
                                    match={event.content}
                                    personTag={event.page.tag}
                                    onClose={() => setMatchOpen(false)}
                                />
                            )}
                        </>
                    ) : (
                        <>
                            <DotaMatchCard match={event.content} onOpen={() => setMatchOpen(true)} />
                            {matchOpen && (
                                <DotaMatchDialog
                                    match={event.content}
                                    personTag={event.page.tag}
                                    onClose={() => setMatchOpen(false)}
                                />
                            )}
                        </>
                    )}
                </>
            )}
            {(event.kind === 'wall' ||
                event.kind === 'comment' ||
                event.kind === 'rating' ||
                event.kind === 'loan') && (
                <>
                    <FeedPublicationHeader
                        page={event.page}
                        author={{ ...event.content, authorName: event.content.authorName || person('unknownAuthor') }}
                    />
                    {(pending || (event.kind === 'rating' && event.content.commentStatus === 'PENDING')) && (
                        <Label theme="warning" className={styles.moderation}>
                            {person('onModeration')}
                        </Label>
                    )}
                    {(event.kind === 'wall' || event.kind === 'comment') && (
                        <ContentText className={styles.prose} text={event.content.text} />
                    )}
                    {event.kind === 'loan' && <CreditEntryContent entry={event.content} />}
                    {event.kind === 'rating' && (
                        <>
                            <Flex gap="3" alignItems="center" className={styles.rating}>
                                <Text className={styles.emoji}>{event.content.emoji.repeat(event.content.value)}</Text>
                                <RatingValue value={event.content.value} precision={0} />
                            </Flex>
                            {event.content.comment && (
                                <ContentText className={styles.prose} text={event.content.comment} />
                            )}
                        </>
                    )}
                    <Flex gap="3" alignItems="center" justifyContent="space-between" wrap className={styles.footer}>
                        {!pending && (
                            <ContentLike
                                key={`${event.content.id}:${event.content.likes}:${event.content.likedByMe}:${event.content.dislikes}:${event.content.dislikedByMe}`}
                                kind={
                                    event.kind === 'wall' || event.kind === 'comment'
                                        ? 'COMMENT'
                                        : event.kind === 'rating'
                                          ? 'RATING'
                                          : 'LOAN'
                                }
                                id={event.content.id}
                                likes={event.content.likes}
                                liked={event.content.likedByMe}
                                dislikes={event.content.dislikes}
                                disliked={event.content.dislikedByMe}
                                signedIn={signedIn}
                            />
                        )}
                        {event.kind !== 'loan' && <ContentTime date={event.createdAt} className={styles.date} />}
                    </Flex>
                </>
            )}
            {event.kind === 'achievement' && (
                <>
                    <Flex alignItems="center" gap="2" wrap className={styles.header}>
                        <AppLink href={`/${locale}/person/${event.page.tag}`} className={styles.page}>
                            <PersonIdentity person={event.page} density="compact" compactName />
                        </AppLink>
                        <Text color="secondary" className={styles.onPage}>
                            {t('eventAchievement')}
                        </Text>
                    </Flex>
                    <Flex gap="4" alignItems="center">
                        <LoadedImage
                            src={`/api/person/v1/achievements/${event.content.achievement.id}/image`}
                            alt=""
                            width={112}
                            height={112}
                        />
                        <Flex direction="column" gap="2">
                            <Text as="h2" className={styles.achievementTitle}>
                                {event.content.achievement.title}
                            </Text>
                            <Text>{event.content.note || event.content.achievement.description}</Text>
                        </Flex>
                    </Flex>
                    <Flex justifyContent="flex-end" className={styles.footer}>
                        <ContentTime date={event.createdAt} className={styles.date} />
                    </Flex>
                </>
            )}
            {(event.kind === 'photo' || event.kind === 'moment') && (
                <FeedMedia
                    page={event.page}
                    mediaId={event.content.mediaId}
                    kind={event.kind === 'photo' ? 'PHOTO' : 'MOMENT'}
                    signedIn={signedIn}
                    onChanged={onChanged}
                />
            )}
        </Box>
    );
}
