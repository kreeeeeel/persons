'use client';

import { useTranslate } from '@persons/i18n';
import { LoadError } from '@persons/ui/loading/LoadError';

export default function ErrorPage({ retry }: { readonly retry: () => void }) {
    const t = useTranslate('common');
    return (
        <LoadError
            title={t('loadingErrorTitle')}
            description={t('loadingErrorDescription')}
            retryLabel={t('retry')}
            onRetry={retry}
        />
    );
}
