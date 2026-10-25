'use client';

import { useState } from 'react';
import { Box, Button, Checkbox, Flex, Link, Text, TextInput } from '@gravity-ui/uikit';
import type { Register } from '@persons/id-client';
import { useLocale, useTranslate } from '@persons/i18n';
import { PendingButton } from '@/shared/ui/PendingButton/PendingButton';
import styles from '@/modules/id/components/DetailsForm/DetailsForm.module.css';

const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 10;

export function DetailsForm({
    value,
    onChange,
    pending,
    onSubmit,
    onBack,
}: {
    readonly value: Register;
    readonly onChange: (value: Register) => void;
    readonly pending: boolean;
    readonly onSubmit: () => void;
    readonly onBack: () => void;
}) {
    const t = useTranslate('id');
    const locale = useLocale();
    const [accepted, setAccepted] = useState(false);
    const fields = [
        { key: 'firstName' as const, autocomplete: 'given-name', required: true },
        { key: 'lastName' as const, autocomplete: 'family-name', required: true },
        { key: 'patronymic' as const, autocomplete: 'additional-name', required: false },
        { key: 'email' as const, autocomplete: 'email', required: true },
    ];

    return (
        <Box
            as="form"
            onSubmit={(event) => {
                event.preventDefault();
                if (accepted && !pending) {
                    onSubmit();
                }
            }}
            aria-busy={pending}
        >
            <Flex direction="column" gap="4">
                {fields.map((field) => (
                    <Flex direction="column" gap="2" key={field.key}>
                        <Flex gap="2" alignItems="baseline">
                            <Text as="label" htmlFor={field.key} variant="body-2">
                                {t(field.key)}
                            </Text>
                            {!field.required && (
                                <Text color="hint" variant="caption-1">
                                    {t('optional')}
                                </Text>
                            )}
                        </Flex>
                        <TextInput
                            id={field.key}
                            name={field.key}
                            value={value[field.key] ?? ''}
                            onUpdate={(updated) => onChange({ ...value, [field.key]: updated })}
                            autoComplete={field.autocomplete}
                            type={field.key === 'email' ? 'email' : 'text'}
                            size="xl"
                            disabled={pending}
                            controlProps={{
                                required: field.required,
                                maxLength: field.key === 'email' ? MAX_EMAIL_LENGTH : MAX_NAME_LENGTH,
                            }}
                        />
                    </Flex>
                ))}
                <Flex direction="column" gap="3" className={styles.consent}>
                    <Checkbox
                        size="l"
                        checked={accepted}
                        onUpdate={setAccepted}
                        disabled={pending}
                        controlProps={{ required: true }}
                    >
                        {t('acceptTermsPrefix')}{' '}
                        <Link href={`/legal/${locale}/terms`} target="_blank" rel="noopener noreferrer">
                            {t('termsLink')}
                        </Link>
                    </Checkbox>
                </Flex>
                <PendingButton pending={pending} disabled={!accepted}>
                    {t('next')}
                </PendingButton>
                <Button view="flat" size="xl" width="max" onClick={onBack} disabled={pending}>
                    {t('alreadyAccount')}
                </Button>
            </Flex>
        </Box>
    );
}
