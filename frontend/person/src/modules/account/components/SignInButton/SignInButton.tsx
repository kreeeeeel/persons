'use client';

import { Button } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import type { SignInButtonProps } from '@/modules/account/components/SignInButton/SignInButton.types';
import styles from '@/modules/account/components/SignInButton/SignInButton.module.css';

export function SignInButton({ href }: SignInButtonProps) {
    const t = useTranslate('account');

    return (
        <Button view="action" size="xl" href={href} className={styles.login}>
            {t('signIn')}
        </Button>
    );
}
