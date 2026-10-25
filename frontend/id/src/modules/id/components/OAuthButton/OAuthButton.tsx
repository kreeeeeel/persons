'use client';

import { Box, Button, Divider, Flex, Text } from '@gravity-ui/uikit';
import { useLocale, useTranslate } from '@persons/i18n';
import styles from '@/modules/id/components/OAuthButton/OAuthButton.module.css';

export function OAuthButton({ disabled, returnTo }: { readonly disabled: boolean; readonly returnTo?: string }) {
    const t = useTranslate('id');
    const locale = useLocale();

    return (
        <Flex direction="column" gap="4" className={styles.root}>
            <Divider align="center">
                <Text color="secondary" className={styles.label}>
                    {t('or')}
                </Text>
            </Divider>
            <Button
                size="xl"
                view="outlined"
                width="max"
                href={`/api/oauth/yandex/start?locale=${locale}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`}
                disabled={disabled}
                className={styles.button}
            >
                <Flex alignItems="center" justifyContent="center" gap="2" className={styles.provider}>
                    <Box className={styles.mark} aria-hidden="true">
                        {'Я'}
                    </Box>
                    <Text className={styles.label}>{t('yandexSignIn')}</Text>
                </Flex>
            </Button>
        </Flex>
    );
}
