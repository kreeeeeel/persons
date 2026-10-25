'use client';

import { Box, Flex, Text } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import styles from '@/modules/id/components/StepIndicator/StepIndicator.module.css';

const STEPS_1 = 1;
const STEPS_2 = 2;
const STEPS_3 = 3;
const ARIA_VALUEMIN_1 = 1;
const ARIA_VALUEMAX_3 = 3;

export function StepIndicator({ step }: { readonly step: number }) {
    const t = useTranslate('id');
    const steps = [STEPS_1, STEPS_2, STEPS_3];

    return (
        <Flex
            direction="column"
            gap="3"
            className={styles.root}
            role="progressbar"
            aria-valuemin={ARIA_VALUEMIN_1}
            aria-valuemax={ARIA_VALUEMAX_3}
            aria-valuenow={step}
            aria-label={t('stepLabel', { step })}
        >
            <Flex gap="2">
                {steps.map((value) => (
                    <Box key={value} className={`${styles.bar} ${value <= step ? styles.active : ''}`} />
                ))}
            </Flex>
            <Text variant="body-2" color="secondary" className={styles.label}>
                {t('stepLabel', { step })}
            </Text>
        </Flex>
    );
}
