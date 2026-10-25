'use client';

import { useTranslate } from '@persons/i18n';
import { Flex } from '@gravity-ui/uikit';
import { LoadError } from '@persons/ui/loading/LoadError';
import styles from '@/app/[locale]/ErrorPage.module.css';

export default function ErrorPage({ retry }: { readonly retry: () => void }) {
    const t = useTranslate('common');
    return (
        <Flex alignItems="center" justifyContent="center" className={styles.root}>
            <LoadError
                title={t('loadingErrorTitle')}
                description={t('loadingErrorDescription')}
                retryLabel={t('retry')}
                onRetry={retry}
            />
        </Flex>
    );
}
