'use client';

import { Flex, Icon, Text, Tooltip } from '@gravity-ui/uikit';
import { Eye, Star } from '@gravity-ui/icons';
import { useLocale } from 'next-intl';
import { useTranslate } from '@persons/i18n';
import { RatingValue } from '@persons/person-domain/RatingValue';
import { BrandLoader } from '@persons/ui/BrandLoader';
import type { ProfileMetricsProps } from '@/modules/profile/components/ProfileMetrics/ProfileMetrics.types';
import styles from '@/modules/profile/components/ProfileMetrics/ProfileMetrics.module.css';

export function ProfileMetrics({ stats }: ProfileMetricsProps) {
    const t = useTranslate('person');
    const details = useTranslate('profileDetails');
    const locale = useLocale();

    return (
        <Flex role="group" aria-label={details('metrics')} alignItems="center" gap="5" className={styles.root}>
            <Tooltip content={t('views')}>
                <Flex role="group" aria-label={t('views')} alignItems="center" gap="2">
                    <Icon data={Eye} size={20} />
                    <Text className={styles.value}>{new Intl.NumberFormat(locale).format(stats.views)}</Text>
                </Flex>
            </Tooltip>
            <Tooltip content={t('ratings')}>
                <Flex role="group" aria-label={t('ratings')} alignItems="center" gap="2">
                    <Icon data={Star} size={20} />
                    <RatingValue value={stats.ratingAverage ?? 0} count={stats.ratings} className={styles.value} />
                    {stats.calculationPending && <BrandLoader compact label={t('ratingUpdating')} />}
                </Flex>
            </Tooltip>
        </Flex>
    );
}
