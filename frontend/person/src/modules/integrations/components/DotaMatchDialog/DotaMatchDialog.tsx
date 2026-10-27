'use client';

import { dotaRankLabel } from '@/modules/integrations/model/dotaRankLabel';

import { Box, Button, Dialog, Flex, Icon, Label, Text, Tooltip } from '@gravity-ui/uikit';
import { ArrowUpRightFromSquare } from '@gravity-ui/icons';
import { LoadedImage } from '@persons/ui';
import { useLocale, useTranslate } from '@persons/i18n';
import type { DotaMatch } from '@/modules/integrations/model/DotaMatch';
import { DotaInventory } from '@/modules/integrations/components/DotaInventory/DotaInventory';
import styles from '@/modules/integrations/components/DotaMatchDialog/DotaMatchDialog.module.css';

export function DotaMatchDialog({
    match,
    onClose,
}: {
    readonly match: DotaMatch;
    readonly onClose: () => void;
    readonly personTag?: string;
}) {
    const t = useTranslate('integrations');
    const locale = useLocale();
    const number = new Intl.NumberFormat(locale);
    const playedAt = new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Moscow',
    }).format(new Date(match.playedAt));
    const facts = [
        { label: t('duration'), value: match.duration },
        { label: t('rank'), value: dotaRankLabel(match.rank, t) },
        {
            label: 'HD',
            description: t('heroDamage'),
            value: match.heroDamage === undefined ? '—' : number.format(match.heroDamage),
        },
        {
            label: 'TD',
            description: t('buildingDamage'),
            value: match.buildingDamage === undefined ? '—' : number.format(match.buildingDamage),
        },
    ];

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
            <Tooltip content={t('openOpenDota')}>
                <Button
                    href={match.matchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="m"
                    view="flat-secondary"
                    aria-label={t('openOpenDota')}
                    className={styles.matchLink}
                >
                    <Icon data={ArrowUpRightFromSquare} size={20} />
                </Button>
            </Tooltip>
            <Dialog.Body className={styles.body}>
                <Flex direction="column" alignItems="center" gap="3" className={styles.hero}>
                    <LoadedImage
                        src={match.heroIconUrl ?? `/assets/integrations/dotabuff/${match.heroId}-icon.png`}
                        alt={match.hero}
                        width={80}
                        height={80}
                        className={styles.heroIcon}
                    />
                    <Text as="h2" className={styles.heroName}>
                        {match.hero}
                    </Text>
                    <Label theme={match.result === 'victory' ? 'success' : 'danger'} size="m">
                        <Text className={styles.result}>{t(match.result)}</Text>
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
                            <Text className={styles.factValue}>{fact.value}</Text>
                            <Text
                                as={fact.description ? 'abbr' : 'span'}
                                title={fact.description}
                                color="secondary"
                                className={styles.factLabel}
                            >
                                {fact.label}
                            </Text>
                        </Flex>
                    ))}
                </Box>
                <Box className={styles.kda} aria-label={t('kda')}>
                    {(['kills', 'deaths', 'assists'] as const).map((key) => (
                        <Flex key={key} direction="column" alignItems="center" gap="2">
                            <Text className={styles.score}>{match[key]}</Text>
                            <Text color="secondary">{t(key)}</Text>
                        </Flex>
                    ))}
                </Box>
                <DotaInventory items={match.items} neutralItem={match.neutralItem} />
                <Text as="time" dateTime={match.playedAt} className={styles.date}>
                    {playedAt}
                </Text>
            </Dialog.Body>
        </Dialog>
    );
}
