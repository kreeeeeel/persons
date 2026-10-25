'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Flex, Icon, Text } from '@gravity-ui/uikit';
import { PersonPlus } from '@gravity-ui/icons';
import { useTranslate } from '@persons/i18n';
import { EmptyIllustration } from '@persons/person-domain/EmptyIllustration';
import { ProfileEditor } from '@persons/person-domain/ProfileEditor';
import { SiteHeader } from '@/shared/ui/SiteHeader/SiteHeader';
import type { MyPageScreenProps } from '@/modules/account/components/MyPageScreen/MyPageScreen.types';
import styles from '@/modules/account/components/MyPageScreen/MyPageScreen.module.css';

export function MyPageScreen({ account, pending }: MyPageScreenProps) {
    const t = useTranslate('person');
    const router = useRouter();
    const [open, setOpen] = useState(false);
    return (
        <Box className={styles.page}>
            <SiteHeader>{account}</SiteHeader>
            <Flex as="main" direction="column" alignItems="center" gap="4" className={styles.content}>
                <Box className={styles.art}>
                    <EmptyIllustration kind="my-page" />
                </Box>
                <Text as="h1" variant="header-2">
                    {t(pending ? 'myPagePendingTitle' : 'myPageEmptyTitle')}
                </Text>
                <Text color="secondary" className={styles.description}>
                    {t(pending ? 'myPagePendingDescription' : 'myPageEmptyDescription')}
                </Text>
                {!pending && (
                    <Button size="l" view="action" onClick={() => setOpen(true)}>
                        <Icon data={PersonPlus} size={20} />
                        {t('requestPageCreation')}
                    </Button>
                )}
            </Flex>
            {open && (
                <ProfileEditor
                    ownRequest
                    onClose={() => setOpen(false)}
                    onSaved={() => {
                        setOpen(false);
                        router.refresh();
                    }}
                />
            )}
        </Box>
    );
}
