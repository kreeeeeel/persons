'use client';

import { Box, Flex, Icon, Text } from '@gravity-ui/uikit';
import { ChevronRight } from '@gravity-ui/icons';
import { useTranslate } from '@persons/i18n';
import { LoadedImage } from '@persons/ui';
import { CsRank } from '@/modules/integrations/components/CsRank/CsRank';
import type { CsMatch } from '@/modules/integrations/model/CsMatch';
import { csMapImage, csMapTitle, csModeKeys, csOutcomeKeys } from '@/modules/integrations/model/csPresentation';
import styles from '@/modules/integrations/components/CsMatchCard/CsMatchCard.module.css';

export function CsMatchCard({ match, onOpen }: { readonly match: CsMatch; readonly onOpen: () => void }) {
    const t = useTranslate('integrations');
    const map = csMapTitle(match.mapName);
    const kda = `${match.kills} / ${match.deaths} / ${match.assists}`;
    return (
        <Box
            as="button"
            type="button"
            className={styles.card}
            data-outcome={match.outcome}
            onClick={onOpen}
            aria-label={t('openCsMatch', {
                map,
                result: t(csOutcomeKeys[match.outcome]),
                score: `${match.score}:${match.opponentScore}`,
                kda,
            })}
        >
            <Flex alignItems="center" gap="5" className={styles.summary}>
                <Box className={styles.map}>
                    <LoadedImage
                        src={csMapImage(match.mapName)}
                        alt=""
                        width={64}
                        height={64}
                        responsive
                        objectFit="contain"
                        className={styles.mapImage}
                    />
                </Box>
                <Flex direction="column" gap="2" className={styles.identity}>
                    <Text className={styles.name}>
                        {t(csModeKeys[match.mode])} · {map}
                    </Text>
                    <CsRank match={match} compact />
                </Flex>
            </Flex>
            <Flex direction="column" gap="2" alignItems="flex-end" className={styles.result}>
                <Text className={styles.resultLine}>
                    <Text className={styles.outcome}>{t(csOutcomeKeys[match.outcome])}</Text>
                    <Text className={styles.separator}> · </Text>
                    <Text className={styles.score} aria-label={t('mapScore')}>
                        {match.score}:{match.opponentScore}
                    </Text>
                </Text>
                <Text className={styles.kda}>
                    <Text color="secondary">{t('kda')}</Text> {kda}
                </Text>
            </Flex>
            <Box className={styles.chevron}>
                <Icon data={ChevronRight} size={18} />
            </Box>
        </Box>
    );
}
