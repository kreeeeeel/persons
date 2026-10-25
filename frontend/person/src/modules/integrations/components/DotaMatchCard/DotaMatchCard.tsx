'use client';

import { Box, Flex, Icon, Text } from '@gravity-ui/uikit';
import { ChevronRight } from '@gravity-ui/icons';
import { useTranslate } from '@persons/i18n';
import { LoadedImage } from '@persons/ui';
import type { DotaMatch } from '@/modules/integrations/model/DotaMatch';
import styles from '@/modules/integrations/components/DotaMatchCard/DotaMatchCard.module.css';
import { dotaRankImage, dotaRankStars } from '@/modules/integrations/model/dotaRankImage';

export function DotaMatchCard({ match, onOpen }: { readonly match: DotaMatch; readonly onOpen: () => void }) {
    const t = useTranslate('integrations');
    const kda = `${match.kills} / ${match.deaths} / ${match.assists}`;
    const stars = dotaRankStars(match.rank);
    const hasScore = match.score !== undefined && match.opponentScore !== undefined;

    return (
        <Box
            as="button"
            type="button"
            className={styles.card}
            data-result={match.result}
            onClick={onOpen}
            aria-label={t(hasScore ? 'openMatchScore' : 'openMatch', {
                hero: match.hero,
                result: t(match.result),
                kda,
                score: hasScore ? `${match.score}:${match.opponentScore}` : '',
            })}
        >
            <Box className={styles.heroIcon}>
                <LoadedImage
                    src={match.heroIconUrl ?? `/assets/integrations/dotabuff/${match.heroId}-icon.png`}
                    alt=""
                    width={56}
                    height={56}
                    className={styles.pixelIcon}
                />
            </Box>
            <Flex direction="column" gap="2" className={styles.identity}>
                <Text className={styles.name}>{match.hero}</Text>
                <Flex gap="2" alignItems="center" className={styles.rank}>
                    <Box className={styles.rankBadge}>
                        <LoadedImage
                            src={dotaRankImage(match.rank)}
                            alt=""
                            width={24}
                            height={24}
                            objectFit="contain"
                        />
                        {stars && (
                            <Box className={styles.rankStars}>
                                <LoadedImage src={stars} alt="" width={24} height={24} objectFit="contain" />
                            </Box>
                        )}
                    </Box>
                    <Text>{match.rank === 'legend4' ? t('legend4') : (match.rank ?? t('unknownRank'))}</Text>
                </Flex>
            </Flex>
            <Flex direction="column" gap="2" alignItems="flex-end" className={styles.result}>
                <Text className={styles.resultLine}>
                    <Text className={styles.outcome}>{t(match.result)}</Text>
                    {hasScore && (
                        <>
                            <Text className={styles.separator}> · </Text>
                            <Text className={styles.score} aria-label={t('mapScore')}>
                                {match.score}:{match.opponentScore}
                            </Text>
                        </>
                    )}
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
