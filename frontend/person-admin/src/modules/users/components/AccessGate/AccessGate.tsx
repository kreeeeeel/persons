'use client';

import { Button, Flex, Text } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import { LoadedImage } from '@persons/ui';
import checkpoint from '@persons/assets/illustrations/access-denied-krel-v1.png';
import styles from '@/modules/users/components/AccessGate/AccessGate.module.css';

export function AccessGate({
    signInUrl,
    signedIn,
    publicUrl,
}: {
    readonly signInUrl: string;
    readonly signedIn: boolean;
    readonly publicUrl?: string;
}) {
    const t = useTranslate('admin');

    return (
        <Flex
            as="main"
            direction="column"
            alignItems="center"
            justifyContent="center"
            gap="4"
            className={styles.screen}
        >
            <Flex className={styles.illustration}>
                <LoadedImage
                    src={checkpoint.src}
                    width={checkpoint.width}
                    height={checkpoint.height}
                    responsive
                    alt={t('checkpointAlt')}
                />
            </Flex>
            <Text as="h1" variant="header-1" className={styles.title}>
                {t(signedIn ? 'deniedTitle' : 'signInTitle')}
            </Text>
            <Text color="secondary" className={styles.description}>
                {t(signedIn ? 'deniedText' : 'signInText')}
            </Text>
            <Button href={signedIn && publicUrl ? publicUrl : signInUrl} size="xl" view="action">
                {t(signedIn && publicUrl ? 'returnToSite' : 'openId')}
            </Button>
        </Flex>
    );
}
