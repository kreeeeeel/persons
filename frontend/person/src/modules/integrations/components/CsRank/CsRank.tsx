'use client';

import { Flex, Text, Tooltip } from '@gravity-ui/uikit';
import { LoadedImage } from '@persons/ui';
import { useLocale, useTranslate } from '@persons/i18n';
import type { CsMatch } from '@/modules/integrations/model/CsMatch';
import { csRankImage } from '@/modules/integrations/model/csPresentation';
import styles from '@/modules/integrations/components/CsRank/CsRank.module.css';

const ELO_LABEL = 'ELO';

export function CsRank({
    match,
    showEloSuffix = true,
    compact = false,
}: {
    readonly match: CsMatch;
    readonly showEloSuffix?: boolean;
    readonly compact?: boolean;
}) {
    const t = useTranslate('integrations');
    const locale = useLocale();
    const faceit = match.mode === 'FACEIT';
    const label =
        faceit && match.faceitLevel
            ? t('faceitLevel', { level: match.faceitLevel })
            : match.rank
              ? t('rankValue', { rank: match.rank })
              : t('unknownRank');
    return (
        <Tooltip content={label}>
            <Flex alignItems="center" gap="2" className={styles.rank}>
                <LoadedImage
                    src={csRankImage(match)}
                    alt={label}
                    width={faceit ? (compact ? 24 : 36) : compact ? 61 : 92}
                    height={compact ? 24 : 36}
                    objectFit="contain"
                />
                {faceit && (
                    <Text className={styles.elo}>
                        {match.faceitElo === undefined
                            ? '—'
                            : new Intl.NumberFormat(locale, { useGrouping: false }).format(match.faceitElo)}
                        {showEloSuffix && <> {ELO_LABEL}</>}
                    </Text>
                )}
            </Flex>
        </Tooltip>
    );
}
