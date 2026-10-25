'use client';

import { useTranslate } from '@persons/i18n';
import { PageLoader } from '@persons/ui/PageLoader';

export function LoadingPage() {
    const t = useTranslate('common');
    return <PageLoader label={t('loading')} />;
}
