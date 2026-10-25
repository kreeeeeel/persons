'use client';

import { Box, Button, Flex, PasswordInput, Text } from '@gravity-ui/uikit';
import { useState } from 'react';
import { useTranslate } from '@persons/i18n';
import { AvatarPicker } from '@persons/photo-editor';
import { PendingButton } from '@/shared/ui/PendingButton/PendingButton';

const MAX_PASSWORD_BYTES = 72;
const MIN_PASSWORD_LENGTH = 10;

export function ProfileForm({
    name,
    recovery,
    pending,
    onSubmit,
    onBack,
}: {
    readonly name: string;
    readonly recovery: boolean;
    readonly pending: boolean;
    readonly onSubmit: (password: string, avatar?: string) => void;
    readonly onBack: () => void;
}) {
    const t = useTranslate('id');
    const common = useTranslate('common');
    const [password, setPassword] = useState('');
    const [avatar, setAvatar] = useState<string>();
    const passwordTooLong = new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES;

    return (
        <Box
            as="form"
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit(password, avatar);
            }}
            aria-busy={pending}
        >
            <Flex direction="column" gap="4">
                {!recovery && <AvatarPicker name={name} value={avatar} onChange={setAvatar} disabled={pending} />}
                <Flex direction="column" gap="2">
                    <Text as="label" htmlFor="new-password" variant="body-2">
                        {t('newPassword')}
                    </Text>
                    <PasswordInput
                        id="new-password"
                        name="password"
                        value={password}
                        onUpdate={setPassword}
                        size="xl"
                        autoComplete="new-password"
                        hideCopyButton
                        disabled={pending}
                        validationState={passwordTooLong ? 'invalid' : undefined}
                        errorMessage={passwordTooLong ? t('passwordTooLong') : undefined}
                        controlProps={{
                            required: true,
                            minLength: MIN_PASSWORD_LENGTH,
                            maxLength: MAX_PASSWORD_BYTES,
                        }}
                    />
                    <Text color="hint" variant="caption-2">
                        {t('passwordHint')}
                    </Text>
                </Flex>
                <PendingButton pending={pending} disabled={password.length < MIN_PASSWORD_LENGTH || passwordTooLong}>
                    {t(recovery ? 'reset' : 'finish')}
                </PendingButton>
                <Button view="flat" size="xl" width="max" onClick={onBack} disabled={pending}>
                    {common('back')}
                </Button>
            </Flex>
        </Box>
    );
}
