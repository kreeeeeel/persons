'use client';

import { Flex, Text } from '@gravity-ui/uikit';
import { useLocale } from 'next-intl';
import { useTranslate } from '@persons/i18n';
import { useMilitaryService } from '@/modules/profile/hooks/useMilitaryService';
import type { MilitaryServiceDateProps } from '@/modules/profile/components/MilitaryServiceDate/MilitaryServiceDate.types';
import styles from '@/modules/profile/components/MilitaryServiceDate/MilitaryServiceDate.module.css';

export function MilitaryServiceDate({ service, today, showDepartureDate = false }: MilitaryServiceDateProps) {
    const t = useTranslate('militaryService');
    const locale = useLocale();
    const state = useMilitaryService(service, today);
    const returned = state.status === 'completed' && !showDepartureDate;
    const date = returned ? service.returnDate : service.departureDate;
    const caption = state.status === 'upcoming' ? 'departurePlanned' : returned ? 'returned' : 'departed';

    return (
        <Flex direction="column" alignItems="center" gap="1" className={styles.root}>
            <Text as="time" dateTime={date} className={styles.date}>
                {new Intl.DateTimeFormat(locale, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'UTC',
                }).format(Date.parse(date ?? service.departureDate))}
            </Text>
            <Text color="secondary" className={styles.caption}>
                {t(caption)}
            </Text>
        </Flex>
    );
}
