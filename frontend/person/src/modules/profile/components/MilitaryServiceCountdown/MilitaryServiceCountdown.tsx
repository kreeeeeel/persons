'use client';

import { Box, Flex, Icon, Progress, Text } from '@gravity-ui/uikit';
import { CircleCheck, House, Suitcase } from '@gravity-ui/icons';
import { useLocale } from 'next-intl';
import { useTranslate } from '@persons/i18n';
import { useMilitaryService } from '@/modules/profile/hooks/useMilitaryService';
import type { MilitaryServiceCountdownProps } from '@/modules/profile/components/MilitaryServiceCountdown/MilitaryServiceCountdown.types';
import styles from '@/modules/profile/components/MilitaryServiceCountdown/MilitaryServiceCountdown.module.css';

export function MilitaryServiceCountdown({ service, today }: MilitaryServiceCountdownProps) {
    const t = useTranslate('militaryService');
    const locale = useLocale();
    const state = useMilitaryService(service, today);
    const upcoming = state.status === 'upcoming';
    const completed = state.status === 'completed';
    const departureToday = state.departureToday && !completed;
    const date = upcoming ? service.departureDate : service.returnDate;
    const dateText = date
        ? new Intl.DateTimeFormat(locale, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
          }).format(Date.parse(date))
        : undefined;
    const title = completed ? 'completed' : upcoming ? 'untilDeparture' : 'untilReturn';

    if (!state.showCountdown) {
        return null;
    }

    return (
        <Flex
            as="section"
            aria-label={t(title)}
            direction="column"
            gap="3"
            className={`${styles.root} ${completed ? styles.completed : ''}`}
        >
            <Flex alignItems="center" gap="3" className={styles.header}>
                <Flex alignItems="center" justifyContent="center" className={styles.icon}>
                    <Icon data={completed ? CircleCheck : upcoming ? Suitcase : House} size={22} />
                </Flex>
                <Flex direction="column" gap="1" className={styles.summary}>
                    {completed || departureToday || state.daysLeft === undefined ? (
                        <Text className={styles.headline}>
                            {t(completed ? 'completed' : departureToday ? 'departureToday' : 'serving')}
                        </Text>
                    ) : (
                        <Flex alignItems="baseline" wrap gap="2">
                            <Text className={styles.number}>{state.daysLeft}</Text>
                            <Text className={styles.unit}>{t('days', { count: state.daysLeft })}</Text>
                            <Text color="secondary" className={styles.subtitle}>
                                {t(upcoming ? 'untilDeparture' : 'untilReturn')}
                            </Text>
                        </Flex>
                    )}
                    <Text color="secondary" className={styles.caption}>
                        {dateText ? (
                            <Text as="time" dateTime={date}>
                                {t(upcoming ? 'departureDate' : 'returnDate', { date: dateText })}
                            </Text>
                        ) : (
                            t('returnUnknown')
                        )}
                    </Text>
                </Flex>
            </Flex>
            {!upcoming && !completed && state.total !== undefined && (
                <Flex direction="column" gap="2">
                    <Box
                        role="progressbar"
                        aria-label={t('progress', { percent: Math.floor(state.progress) })}
                        aria-valuenow={Math.floor(state.progress)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    >
                        <Progress value={state.progress} size="s" theme="misc" />
                    </Box>
                    <Text color="secondary" className={styles.caption}>
                        {t('passed', { elapsed: state.elapsed, total: state.total })}
                    </Text>
                </Flex>
            )}
            {state.daysLeft === undefined && (
                <Text color="secondary" className={styles.caption}>
                    {t('serviceDays', { count: state.elapsed })}
                </Text>
            )}
        </Flex>
    );
}
