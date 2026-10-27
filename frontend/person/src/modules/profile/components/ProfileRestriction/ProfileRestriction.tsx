'use client';

import { useState } from 'react';
import { Ban, CircleInfo } from '@gravity-ui/icons';
import { Box, Button, Flex, Icon, Popover, Text } from '@gravity-ui/uikit';
import { useLocale, useTranslate } from '@persons/i18n';
import type { AccountRestriction } from '@persons/person-client';
import styles from '@/modules/profile/components/ProfileRestriction/ProfileRestriction.module.css';

export function ProfileRestriction({
    restriction,
    name,
}: {
    readonly restriction: AccountRestriction;
    readonly name: string;
}) {
    const t = useTranslate('person');
    const locale = useLocale();
    const [open, setOpen] = useState(false);
    const until = restriction.expiresAt
        ? new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'Europe/Moscow' }).format(
              restriction.expiresAt,
          )
        : undefined;
    return (
        <Flex gap="3" alignItems="center" className={styles.root} role="region" aria-label={t('profileRestriction')}>
            <Icon data={Ban} size={24} />
            <Flex direction="column" gap="1" className={styles.message}>
                <Text variant="subheader-2">{t('profilePartiallyBlocked', { name })}</Text>
                <Text>{restriction.reason}</Text>
                <Text color="secondary">{until ? t('restrictedUntil', { date: until }) : t('restrictedForever')}</Text>
            </Flex>
            <Popover
                open={open}
                onOpenChange={setOpen}
                trigger="all"
                placement="bottom-end"
                content={
                    <Flex direction="column" gap="2" className={styles.details}>
                        <Text variant="subheader-2">{t('restrictedFeatures')}</Text>
                        <Box as="ul" className={styles.list}>
                            {restriction.scopes.map((scope) => (
                                <Text as="li" key={scope}>
                                    {t(`blockedScope${scope}`)}
                                </Text>
                            ))}
                        </Box>
                    </Flex>
                }
            >
                <Button
                    view="flat"
                    size="l"
                    className={styles.info}
                    aria-label={t('restrictedFeatures')}
                    aria-expanded={open}
                >
                    <Icon data={CircleInfo} size={22} />
                </Button>
            </Popover>
        </Flex>
    );
}
