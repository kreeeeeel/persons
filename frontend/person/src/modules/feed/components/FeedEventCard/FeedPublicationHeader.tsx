'use client';

import { Flex, Text } from '@gravity-ui/uikit';
import type { ReactNode } from 'react';
import type { PersonSummary } from '@persons/person-client';
import { useLocale, useTranslate } from '@persons/i18n';
import { AppLink } from '@persons/ui/AppLink';
import { CommentAuthor } from '@persons/person-domain/CommentAuthor';
import type { CommentAuthorProps } from '@persons/person-domain/CommentAuthor/CommentAuthor.types';
import { PersonIdentity } from '@persons/person-domain/PersonIdentity';
import styles from '@/modules/feed/components/FeedEventCard/FeedEventCard.module.css';

export function FeedPublicationHeader({
    author,
    page,
    metadata,
}: {
    readonly author: CommentAuthorProps['comment'];
    readonly page: PersonSummary;
    readonly metadata?: ReactNode;
}) {
    const locale = useLocale();
    const t = useTranslate('feed');
    return (
        <Flex alignItems="flex-start" gap="3" className={styles.header}>
            <Flex alignItems="center" gap="3" wrap className={styles.publisher}>
                <CommentAuthor comment={author} prominent compactName />
                <Flex alignItems="center" gap="3" className={styles.destinationPage}>
                    <Text color="secondary" className={styles.onPage}>
                        {t('onPage')}
                    </Text>
                    <AppLink href={`/${locale}/person/${page.tag}`} className={styles.page}>
                        <PersonIdentity person={page} size={44} prominent compactName />
                    </AppLink>
                </Flex>
            </Flex>
            {metadata}
        </Flex>
    );
}
