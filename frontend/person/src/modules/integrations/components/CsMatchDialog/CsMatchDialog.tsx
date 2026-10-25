'use client';

import { Box, Button, ClipboardButton, Dialog, Flex, Icon, Label, Text, Tooltip } from '@gravity-ui/uikit';
import { contentShareLink } from '@persons/person-domain/content/shareLink';
import { ArrowUpRightFromSquare } from '@gravity-ui/icons';
import { LoadedImage } from '@persons/ui';
import { useLocale, useTranslate } from '@persons/i18n';
import { CsRank } from '@/modules/integrations/components/CsRank/CsRank';
import type { CsMatch } from '@/modules/integrations/model/CsMatch';
import {
    csMapImage,
    csMapTitle,
    csOutcomeKeys,
    personalPerformanceTone,
} from '@/modules/integrations/model/csPresentation';
import styles from '@/modules/integrations/components/CsMatchDialog/CsMatchDialog.module.css';
import { LeetifyAttribution } from '@/modules/integrations/components/LeetifyAttribution/LeetifyAttribution';

export function CsMatchDialog({
    match,
    onClose,
    personTag,
}: {
    readonly match: CsMatch;
    readonly onClose: () => void;
    readonly personTag?: string;
}) {
    const t = useTranslate('integrations');
    const person = useTranslate('person');
    const locale = useLocale();
    const map = csMapTitle(match.mapName);
    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    const duration =
        match.durationSeconds === undefined
            ? '—'
            : `${Math.floor(match.durationSeconds / 60)}:${String(match.durationSeconds % 60).padStart(2, '0')}`;
    const facts = [
        { label: t('duration'), value: duration },
        { label: t('rank'), value: <CsRank match={match} showEloSuffix={false} /> },
        { label: t('kd'), value: match.kd === undefined ? '—' : number.format(match.kd) },
        { label: t('adr'), value: match.adr === undefined ? '—' : number.format(match.adr) },
    ];
    const stats = [
        { label: t('kills'), value: number.format(match.kills) },
        { label: t('deaths'), value: number.format(match.deaths) },
        { label: t('assists'), value: number.format(match.assists) },
        { label: t('hs'), value: match.hsPercent === undefined ? '—' : `${number.format(match.hsPercent)}%` },
    ];
    const performance = match.personalPerformance;
    const performanceText =
        performance === undefined
            ? t('performanceUnavailable')
            : new Intl.NumberFormat(locale, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                  signDisplay: 'always',
              }).format(performance);
    const playedAt = new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Moscow',
    }).format(new Date(match.playedAt));

    return (
        <Dialog
            open
            onClose={onClose}
            hasCloseButton
            maxWidth="m"
            fullWidth
            contentOverflow="auto"
            className={styles.dialog}
            aria-label={t('matchDetails')}
        >
            <Tooltip content={t('openLeetify')}>
                <Button
                    href={match.matchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="m"
                    view="flat-secondary"
                    aria-label={t('openLeetify')}
                    className={styles.matchLink}
                >
                    <Icon data={ArrowUpRightFromSquare} size={20} />
                </Button>
            </Tooltip>
            <Dialog.Body className={styles.body}>
                <Flex direction="column" alignItems="center" gap="3" className={styles.hero}>
                    <LoadedImage
                        src={csMapImage(match.mapName)}
                        alt={map}
                        width={96}
                        height={96}
                        objectFit="contain"
                        className={styles.mapImage}
                    />
                    <Text as="h2" className={styles.mapName}>
                        {map}
                    </Text>
                    <Label
                        theme={
                            match.outcome === 'VICTORY' ? 'success' : match.outcome === 'DEFEAT' ? 'danger' : 'normal'
                        }
                        size="m"
                    >
                        <Text className={styles.result}>
                            <Text>{t(csOutcomeKeys[match.outcome])}</Text>
                            <Text className={styles.separator}> · </Text>
                            <Text className={styles.score} aria-label={t('mapScore')}>
                                {match.score}:{match.opponentScore}
                            </Text>
                        </Text>
                    </Label>
                </Flex>
                <Box className={styles.facts}>
                    {facts.map((fact) => (
                        <Flex
                            key={fact.label}
                            direction="column"
                            alignItems="center"
                            justifyContent="center"
                            gap="2"
                            className={styles.fact}
                        >
                            <Box className={styles.factValue}>{fact.value}</Box>
                            <Text color="secondary" className={styles.factLabel}>
                                {fact.label}
                            </Text>
                        </Flex>
                    ))}
                </Box>
                <Box className={styles.stats} aria-label={t('csStats')}>
                    {stats.map((stat) => (
                        <Flex key={stat.label} direction="column" alignItems="center" gap="2">
                            <Text className={styles.value}>{stat.value}</Text>
                            <Text color="secondary">{stat.label}</Text>
                        </Flex>
                    ))}
                </Box>
                <Flex
                    alignItems="center"
                    justifyContent="space-between"
                    gap="3"
                    wrap
                    className={styles.performance}
                    data-tone={personalPerformanceTone(performance)}
                >
                    <Text className={styles.performanceTitle}>{t('personalPerformance')}</Text>
                    <Label size="m" className={styles.performanceTag}>
                        <Text className={styles.performanceValue}>{performanceText}</Text>
                    </Label>
                </Flex>
                <Flex justifyContent="space-between" alignItems="center" gap="3" wrap className={styles.footer}>
                    <LeetifyAttribution />
                    <Text as="time" dateTime={match.playedAt} className={styles.date}>
                        {playedAt}
                    </Text>
                </Flex>
            </Dialog.Body>
            {personTag && (
                <Dialog.Footer>
                    <Flex gap="3" alignItems="center" justifyContent="center">
                        <ClipboardButton
                            size="l"
                            text={() => contentShareLink(window.location.origin, personTag, 'CS_MATCH', match.id)}
                            aria-label={person('shareMedia')}
                            tooltipInitialText={person('shareMedia')}
                            tooltipSuccessText={person('mediaLinkCopied')}
                        />
                    </Flex>
                </Dialog.Footer>
            )}
        </Dialog>
    );
}
