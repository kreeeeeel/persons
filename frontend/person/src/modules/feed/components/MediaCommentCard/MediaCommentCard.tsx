'use client';

import { useState } from 'react';
import { Box, Button, Flex, Icon, Label, Text } from '@gravity-ui/uikit';
import { Picture, Video } from '@gravity-ui/icons';
import type { Comment, PersonSummary } from '@persons/person-client';
import { useLocale, useTranslate } from '@persons/i18n';
import { AppLink } from '@persons/ui/AppLink';
import { CommentAuthor } from '@persons/person-domain/CommentAuthor';
import { ContentText } from '@persons/person-domain/ContentText';
import { ContentLike } from '@persons/person-domain/ContentLike';
import { ContentTime } from '@persons/person-domain/ContentTime';
import { MediaViewer } from '@persons/person-domain/MediaViewer';
import { PersonIdentity } from '@persons/person-domain/PersonIdentity';
import styles from '@/modules/feed/components/MediaCommentCard/MediaCommentCard.module.css';

export function MediaCommentCard({
    comment,
    page,
    mediaId,
    kind,
    signedIn,
    onChanged,
}: {
    readonly comment: Comment;
    readonly page: PersonSummary;
    readonly mediaId: string;
    readonly kind: 'PHOTO' | 'MOMENT';
    readonly signedIn: boolean;
    readonly onChanged: () => void;
}) {
    const t = useTranslate('feed');
    const person = useTranslate('person');
    const locale = useLocale();
    const [selected, setSelected] = useState<string>();
    const pending = comment.moderationStatus === 'PENDING';
    const label = t(kind === 'PHOTO' ? 'commentOnPhoto' : 'commentOnMoment', { name: page.fullName });
    return (
        <Box
            as="article"
            className={styles.card}
            aria-label={label}
            data-kind={kind === 'PHOTO' ? 'photo' : 'moment'}
            data-created-at={comment.createdAt.toISOString()}
        >
            <Button view="flat" className={styles.open} aria-label={label} onClick={() => setSelected(mediaId)} />
            <Flex alignItems="center" gap="3" className={styles.header}>
                <Flex alignItems="center" gap="3" wrap className={styles.identities}>
                    <CommentAuthor
                        comment={{ ...comment, authorName: comment.authorName || person('unknownAuthor') }}
                        compactName
                        prominent
                    />
                    <Flex gap="2" alignItems="center" className={styles.context}>
                        <Text color="secondary" className={styles.contextText}>
                            {t('onPage')}
                        </Text>
                        <Text className={`${styles.contextText} ${styles.mediaKind}`}>
                            {t(kind === 'PHOTO' ? 'onPhoto' : 'onMoment')}
                        </Text>
                    </Flex>
                    <AppLink href={`/${locale}/person/${page.tag}`} className={styles.page}>
                        <PersonIdentity person={page} size={36} compactName prominent />
                    </AppLink>
                </Flex>
                <Icon data={kind === 'PHOTO' ? Picture : Video} size={20} className={styles.icon} />
            </Flex>
            {pending && <Label theme="warning">{person('onModeration')}</Label>}
            <ContentText className={styles.text} text={comment.text} />
            <Flex gap="3" alignItems="center" justifyContent="space-between" wrap className={styles.footer}>
                {!pending && (
                    <ContentLike
                        key={`${comment.id}:${comment.likes}:${comment.likedByMe}:${comment.dislikes}:${comment.dislikedByMe}`}
                        kind="COMMENT"
                        id={comment.id}
                        likes={comment.likes}
                        liked={comment.likedByMe}
                        dislikes={comment.dislikes}
                        disliked={comment.dislikedByMe}
                        signedIn={signedIn}
                    />
                )}
                <ContentTime date={comment.createdAt} className={styles.time} />
            </Flex>
            {selected && (
                <MediaViewer
                    mediaId={selected}
                    personId={page.id}
                    personTag={page.tag}
                    kind={kind}
                    signedIn={signedIn}
                    onClose={() => {
                        setSelected(undefined);
                        onChanged();
                    }}
                    onNavigate={setSelected}
                    onChanged={onChanged}
                />
            )}
        </Box>
    );
}
