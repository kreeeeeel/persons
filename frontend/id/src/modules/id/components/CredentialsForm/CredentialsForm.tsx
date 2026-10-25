'use client';

import { Box, Button, Flex, Link, PasswordInput, Text, TextInput } from '@gravity-ui/uikit';
import { useState } from 'react';
import { useLocale, useTranslate } from '@persons/i18n';
import { OAuthButton } from '@/modules/id/components/OAuthButton/OAuthButton';
import { PendingButton } from '@/shared/ui/PendingButton/PendingButton';
import type { CredentialsFormProps } from '@/modules/id/components/CredentialsForm/CredentialsForm.types';
import styles from '@/modules/id/components/CredentialsForm/CredentialsForm.module.css';

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_BYTES = 72;
const DISABLED_TAB_INDEX = 1;

export function CredentialsForm({
    pending,
    recovery = false,
    returnTo,
    onSubmit,
    onForgot,
    onRegister,
    onBack,
}: CredentialsFormProps) {
    const t = useTranslate('id');
    const locale = useLocale();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
        <Box
            as="form"
            autoComplete="off"
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit(email, password);
            }}
            aria-busy={pending}
            className={styles.form}
        >
            <Box className={styles.fields}>
                <Flex direction="column" className={styles.field}>
                    <Text as="label" htmlFor="email" variant="body-2">
                        {t('email')}
                    </Text>
                    <TextInput
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onUpdate={setEmail}
                        size="xl"
                        placeholder={t('emailPlaceholder')}
                        autoComplete="email"
                        disabled={pending}
                        controlProps={{ required: true, maxLength: MAX_EMAIL_LENGTH }}
                    />
                </Flex>
                {!recovery && (
                    <Flex direction="column" className={styles.field}>
                        <Text as="label" htmlFor="password" variant="body-2">
                            {t('password')}
                        </Text>
                        <PasswordInput
                            id="password"
                            name="password"
                            value={password}
                            onUpdate={setPassword}
                            size="xl"
                            placeholder={t('passwordPlaceholder')}
                            autoComplete="current-password"
                            hideCopyButton
                            disabled={pending}
                            controlProps={{ required: true, maxLength: MAX_PASSWORD_BYTES }}
                        />
                    </Flex>
                )}
            </Box>
            {!recovery && (
                <Link
                    href={`/${locale}/recovery`}
                    view="secondary"
                    className={styles.forgot}
                    aria-disabled={pending}
                    tabIndex={pending ? -DISABLED_TAB_INDEX : undefined}
                    onClick={(event) => {
                        if (pending) {
                            event.preventDefault();

                            return;
                        }

                        if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
                            event.preventDefault();
                            onForgot();
                        }
                    }}
                >
                    {t('forgot')}
                </Link>
            )}
            <PendingButton pending={pending}>{t(recovery ? 'sendCode' : 'signIn')}</PendingButton>
            <Button view="flat" size="xl" width="max" onClick={recovery ? onBack : onRegister} disabled={pending}>
                {t(recovery ? 'alreadyAccount' : 'createAccount')}
            </Button>
            {!recovery && <OAuthButton disabled={pending} returnTo={returnTo} />}
        </Box>
    );
}
