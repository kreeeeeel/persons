'use client';

import { Box, Flex, Label, Text } from '@gravity-ui/uikit';
import type { PersonStats } from '@persons/person-client';
import { useTranslate } from '@persons/i18n';
import { RatingValue } from '@persons/person-domain/RatingValue';
import { BrandLoader } from '@persons/ui/BrandLoader';
import styles from '@/modules/profile/components/ProfileScreen/ProfileScreen.module.css';

const REPUTATION_THEMES = { UNKNOWN: 'normal', GOOD: 'success', AVERAGE: 'warning', BAD: 'danger' } as const;

export function ProfileStats({ stats }: { readonly stats: PersonStats }) {
    const t = useTranslate('person');

    return (
        <Box className={styles.stats}>
            {(['wall', 'ratings', 'views'] as const).map((key) => (
                <Flex key={key} direction="column" gap="2" alignItems="center" className={styles.stat}>
                    {key === 'ratings' ? (
                        <RatingValue value={stats.ratingAverage ?? 0} count={stats.ratings} className={styles.number} />
                    ) : (
                        <Text className={styles.number}>{key === 'wall' ? stats.comments : stats[key]}</Text>
                    )}
                    {key === 'ratings' && stats.calculationPending && (
                        <BrandLoader compact label={t('ratingUpdating')} />
                    )}
                    <Text color="secondary">{t(key)}</Text>
                </Flex>
            ))}
            <Flex direction="column" gap="2" alignItems="center" justifyContent="center" className={styles.stat}>
                <Label theme={REPUTATION_THEMES[stats.reputation]} size="m" className={styles.reputation}>
                    {t(`reputation${stats.reputation}`)}
                </Label>
                <Text color="secondary">{t('creditScore')}</Text>
            </Flex>
        </Box>
    );
}
