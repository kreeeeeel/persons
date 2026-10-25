'use client';
import { useEffect, useState } from 'react';
import { Calendar } from '@gravity-ui/date-components';
import { dateTime, settings } from '@gravity-ui/date-utils';
import { Button, Flex, Loader, Text } from '@gravity-ui/uikit';
import { useLocale, useTranslate } from '@persons/i18n';

export function CalendarFilter({
    value,
    label,
    min,
    max,
    onChange,
}: {
    readonly value: string;
    readonly label: string;
    readonly min?: string;
    readonly max?: string;
    readonly onChange: (value: string) => void;
}) {
    const locale = useLocale();
    const t = useTranslate('cms');
    const [loaded, setLoaded] = useState('');
    const [error, setError] = useState(false);
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        let active = true;
        settings
            .loadLocale(locale)
            .then(() => {
                if (active) {
                    settings.setLocale(locale);
                    setLoaded(locale);
                }
            })
            .catch(() => {
                if (active) {
                    setError(true);
                }
            });
        return () => {
            active = false;
        };
    }, [locale, revision]);
    if (error) {
        return (
            <Flex direction="column" gap="3">
                <Text>{t('loadError')}</Text>
                <Button
                    onClick={() => {
                        setError(false);
                        setRevision((v) => v + 1);
                    }}
                >
                    {t('retry')}
                </Button>
            </Flex>
        );
    }
    if (loaded !== locale) {
        return <Loader size="m" />;
    }
    const date = (input: string) => dateTime({ input: `${input}T00:00:00Z`, timeZone: 'UTC', lang: locale });
    return (
        <Calendar
            size="l"
            aria-label={label}
            value={value ? date(value) : null}
            timeZone="UTC"
            minValue={min ? date(min) : undefined}
            maxValue={max ? date(max) : undefined}
            onUpdate={(selected) => onChange(selected.format('YYYY-MM-DD'))}
        />
    );
}
