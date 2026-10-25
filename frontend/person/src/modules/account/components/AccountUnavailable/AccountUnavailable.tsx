'use client';

import { Button, Icon } from '@gravity-ui/uikit';
import { ArrowRotateRight } from '@gravity-ui/icons';
import { useRouter } from 'next/navigation';
import { useTranslate } from '@persons/i18n';

export function AccountUnavailable() {
    const t = useTranslate('account');
    const router = useRouter();

    return (
        <Button view="flat" size="xl" aria-label={t('unavailable')} onClick={() => router.refresh()}>
            <Icon data={ArrowRotateRight} size={20} />
        </Button>
    );
}
