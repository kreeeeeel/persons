'use client';

import { useCallback } from 'react';
import { DatePicker } from '@gravity-ui/date-components';
import { dateTime, settings } from '@gravity-ui/date-utils';
import { Button, Flex, Loader, Text } from '@gravity-ui/uikit';
import { useLocale, useTranslate } from '@persons/i18n';
import { usePersonData } from '@persons/person-domain/hooks/usePersonData';
import styles from '@/modules/settings/components/DateTimeVariableInput/DateTimeVariableInput.module.css';

const TIME_ZONE = 'Europe/Moscow';

export function DateTimeVariableInput({
    value,
    disabled,
    onUpdate,
}: {
    readonly value: string;
    readonly disabled: boolean;
    readonly onUpdate: (value: string) => void;
}) {
    const locale = useLocale();
    const t = useTranslate('variables');
    const cms = useTranslate('cms');
    const load = useCallback(
        async (signal: AbortSignal) => {
            await settings.loadLocale(locale);
            if (!signal.aborted) {
                settings.setLocale(locale);
            }
            return locale;
        },
        [locale],
    );
    const resource = usePersonData(`date-time-locale:${locale}`, load);
    if (resource.error) {
        return (
            <Flex direction="column" gap="3" role="alert">
                <Text>{cms('loadError')}</Text>
                <Button size="l" onClick={resource.refresh}>
                    {cms('retry')}
                </Button>
            </Flex>
        );
    }
    if (resource.loading) {
        return <Loader size="m" />;
    }
    const selected = value ? dateTime({ input: value, timeZone: TIME_ZONE, lang: locale }) : null;
    return (
        <Flex direction="column" gap="2">
            <DatePicker
                className={styles.field}
                value={selected?.isValid() ? selected : null}
                onUpdate={(date) => onUpdate(date?.isValid() ? date.toISOString() : '')}
                format={locale === 'ru' ? 'DD.MM.YYYY HH:mm:ss' : 'MM/DD/YYYY HH:mm:ss'}
                timeZone={TIME_ZONE}
                size="xl"
                disabled={disabled}
                hasClear
                aria-label={t('dateTime')}
                aria-describedby="variable-time-zone"
            />
            <Text color="secondary" id="variable-time-zone">
                {t('timeZone')}
            </Text>
        </Flex>
    );
}
