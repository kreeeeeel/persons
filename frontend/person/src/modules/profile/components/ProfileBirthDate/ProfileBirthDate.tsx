'use client';

import { Flex, Text } from '@gravity-ui/uikit';
import { useLocale } from 'next-intl';
import { useTranslate } from '@persons/i18n';
import { useContentClock } from '@persons/person-domain/ContentTime/useContentClock';
import { ageOnDate } from '@/modules/profile/model/ageOnDate';
import { militaryServiceToday } from '@/modules/profile/model/serviceCalendar';
import type { ProfileBirthDateProps } from '@/modules/profile/components/ProfileBirthDate/ProfileBirthDate.types';
import styles from '@/modules/profile/components/ProfileBirthDate/ProfileBirthDate.module.css';

export function ProfileBirthDate({ birthDate, today }: ProfileBirthDateProps) {
    const t = useTranslate('profileDetails');
    const locale = useLocale();
    const now = useContentClock();
    const date = new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(Date.parse(birthDate));
    const age = ageOnDate(birthDate, now === undefined ? today : militaryServiceToday(now));

    return (
        <Flex direction="column" alignItems="center" gap="1" className={styles.root}>
            <Text as="time" dateTime={birthDate} className={styles.value}>
                {t('birthdayValue', { date, age })}
            </Text>
            <Text color="secondary">{t('birthDate')}</Text>
        </Flex>
    );
}
