'use client';

import { useCallback, useState } from 'react';
import { Box, Dialog, Flex, Text } from '@gravity-ui/uikit';
import { LoadedImage } from '@persons/ui';
import { useLocale, useTranslate } from '@persons/i18n';
import { FeedContent } from '@persons/person-domain/FeedContent';
import { InfiniteFeedLoader } from '@persons/person-domain/InfiniteFeedLoader';
import { useInfinitePersonData } from '@persons/person-domain/hooks/useInfinitePersonData';
import { usePersonData } from '@persons/person-domain/hooks/usePersonData';
import { useContentLocation } from '@persons/person-domain/hooks/useContentLocation';
import type { GameIntegration } from '@/modules/integrations/model/GameIntegration';
import styles from '@/modules/integrations/components/IntegrationsPanel/IntegrationsPanel.module.css';

export function GameHistory<Event extends { readonly id: string; readonly playedAt: string }>({
    integration,
    personId,
    personTag,
    active,
}: {
    readonly integration: GameIntegration<Event>;
    readonly personId: string;
    readonly personTag?: string;
    readonly active: boolean;
}) {
    const t = useTranslate('integrations');
    const common = useTranslate('person');
    const locale = useLocale();
    const [localSelection, setSelected] = useState<Event>();
    const location = useContentLocation(personTag);
    const directId = location.content?.kind === integration.shareKind ? location.content.id : undefined;
    const loadSelected = useCallback(
        (signal: AbortSignal) =>
            directId ? integration.loadOne(personId, directId, signal) : Promise.resolve(undefined),
        [directId, integration, personId],
    );
    const direct = usePersonData(
        `game:${integration.id}:${personId}:${directId ?? ''}`,
        loadSelected,
        localSelection?.id === directId ? localSelection : undefined,
    );
    const selected = personTag ? (directId && !direct.error ? direct.data : undefined) : localSelection;
    function closeSelected() {
        setSelected(undefined);
        if (directId) {
            location.close();
        }
    }
    const load = useCallback(
        (page: number, signal: AbortSignal) => integration.load(personId, page, signal),
        [integration, personId],
    );
    const resource = useInfinitePersonData(`games:${integration.id}:${personId}`, load);
    const items = resource.data?.items ?? [];
    const empty = !resource.loading && !resource.error && items.length === 0;
    const dateFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' });

    return (
        <>
            <Flex direction="column" gap="2" className={styles.heading}>
                <Text as="h2" className={styles.title}>
                    {t('history')}
                </Text>
                <Text color="secondary">{t('historyHint')}</Text>
            </Flex>
            {empty ? (
                <Flex direction="column" alignItems="center" gap="3" className={styles.empty}>
                    <Box className={styles.emptyArt}>
                        <LoadedImage
                            src={integration.empty.illustration}
                            alt={t(integration.empty.alt)}
                            width={320}
                            height={320}
                            responsive
                            objectFit="contain"
                        />
                    </Box>
                    <Text as="h3" className={styles.emptyTitle}>
                        {t(integration.empty.title)}
                    </Text>
                    <Text color="secondary">{t(integration.empty.description)}</Text>
                </Flex>
            ) : (
                <FeedContent
                    loading={resource.loading}
                    error={resource.error}
                    empty={false}
                    emptyTitle={common('noDescription')}
                    emptyDescription=""
                    onRetry={resource.refresh}
                >
                    <Flex direction="column" gap="3">
                        {items.map((match, index) => {
                            const date = dateFormat.format(new Date(match.playedAt));
                            const previous = items[index - 1];
                            const startsDay = !previous || dateFormat.format(new Date(previous.playedAt)) !== date;
                            return (
                                <Box key={match.id}>
                                    {startsDay && (
                                        <Text as="h3" className={styles.date}>
                                            {date}
                                        </Text>
                                    )}
                                    <integration.Card
                                        match={match}
                                        onOpen={() => {
                                            setSelected(match);
                                            if (personTag) {
                                                location.open(integration.shareKind, match.id);
                                            }
                                        }}
                                    />
                                </Box>
                            );
                        })}
                    </Flex>
                </FeedContent>
            )}
            <InfiniteFeedLoader {...resource} active={active} />
            {items.length > 0 && integration.Attribution && (
                <Box className={styles.attribution}>
                    <integration.Attribution />
                </Box>
            )}
            {selected && <integration.Details match={selected} onClose={closeSelected} personTag={personTag} />}
            {directId && !selected && (
                <Dialog
                    open
                    hasCloseButton
                    onClose={closeSelected}
                    aria-label={t('matchDetails')}
                    maxWidth="m"
                    fullWidth
                    contentOverflow="auto"
                    className={styles.detailsDialog}
                >
                    <Dialog.Body className={styles.detailsLoading}>
                        <FeedContent
                            loading={direct.loading}
                            error={direct.error}
                            empty={false}
                            emptyTitle=""
                            emptyDescription=""
                            onRetry={direct.refresh}
                        >
                            {null}
                        </FeedContent>
                    </Dialog.Body>
                </Dialog>
            )}
        </>
    );
}
