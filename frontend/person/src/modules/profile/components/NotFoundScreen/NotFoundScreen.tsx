'use client';

import { Box, Button, Flex, Text } from '@gravity-ui/uikit';
import { useLocale, useTranslate } from '@persons/i18n';
import { LoadedImage } from '@persons/ui';
import { SiteHeader } from '@/shared/ui/SiteHeader/SiteHeader';
import styles from '@/modules/profile/components/NotFoundScreen/NotFoundScreen.module.css';

export function NotFoundScreen() {
    const t = useTranslate('person');
    const locale = useLocale();

    return (
        <Box className={styles.page}>
            <SiteHeader>{null}</SiteHeader>
            <Flex as="main" alignItems="center" justifyContent="center" gap="6" className={styles.main}>
                <Box className={styles.art}>
                    <LoadedImage
                        src="/media/not-found-vadim-v1.webp"
                        alt={t('notFoundArt')}
                        width={900}
                        height={1350}
                        responsive
                    />
                </Box>
                <Flex direction="column" gap="4" className={styles.copy}>
                    <Text as="h1" className={styles.title}>
                        {t('notFoundTitle')}
                    </Text>
                    <Text as="p" className={styles.description}>
                        {t('notFoundText')}
                    </Text>
                    <Button size="xl" view="action" href={`/${locale}`} className={styles.home}>
                        {t('home')}
                    </Button>
                </Flex>
            </Flex>
        </Box>
    );
}
