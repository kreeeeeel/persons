'use client';

import { useId, useState } from 'react';
import { Alert, Box, Dialog, Flex, Text, TextInput } from '@gravity-ui/uikit';
import { useRouter } from 'next/navigation';
import { useTranslate } from '@persons/i18n';
import { personClient } from '@persons/person-domain/api/browser';
import { usePersonMutation } from '@persons/person-domain/hooks/usePersonMutation';
import { notifyAccountProfileChanged } from '@persons/person-domain/account/profileChanges';
import type { UserProfileDialogProps } from '@/modules/users/components/UserProfileDialog/UserProfileDialog.types';

const MAX_NAME_LENGTH = 10;

export function UserProfileDialog({ user, onClose, onSaved }: UserProfileDialogProps) {
    const t = useTranslate('admin');
    const account = useTranslate('account');
    const formId = useId();
    const router = useRouter();
    const mutation = usePersonMutation();
    const [profile, setProfile] = useState({
        firstName: user.firstName,
        lastName: user.lastName,
        patronymic: user.patronymic ?? '',
    });
    const invalid =
        !profile.firstName.trim() ||
        !profile.lastName.trim() ||
        Object.values(profile).some((name) => name.length > MAX_NAME_LENGTH);

    function save() {
        if (mutation.pending || invalid) {
            return;
        }
        mutation.run(
            () => personClient.accounts.updateUserProfile({ id: user.id, userProfileUpdate: profile }),
            () => {
                notifyAccountProfileChanged();
                router.refresh();
                onSaved();
            },
            false,
        );
    }

    return (
        <Dialog
            open
            maxWidth="s"
            fullWidth
            hasCloseButton
            contentOverflow="auto"
            aria-label={t('editProfile')}
            onClose={() => {
                if (!mutation.pending) {
                    onClose();
                }
            }}
        >
            <Dialog.Header caption={t('editProfile')} />
            <Dialog.Body>
                <Box
                    as="form"
                    id={formId}
                    onSubmit={(event) => {
                        event.preventDefault();
                        save();
                    }}
                >
                    <Flex direction="column" gap="4">
                        <Text color="secondary">{user.email}</Text>
                        {mutation.error && (
                            <Box role="alert">
                                <Alert theme="danger" message={t(mutation.error)} />
                            </Box>
                        )}
                        {(['lastName', 'firstName', 'patronymic'] as const).map((field) => (
                            <Flex key={field} direction="column" gap="2">
                                <Text as="label" htmlFor={`${formId}-${field}`}>
                                    {account(field)}
                                </Text>
                                <TextInput
                                    id={`${formId}-${field}`}
                                    size="l"
                                    value={profile[field]}
                                    disabled={mutation.pending}
                                    onUpdate={(value) => setProfile((current) => ({ ...current, [field]: value }))}
                                    controlProps={{ required: field !== 'patronymic', maxLength: MAX_NAME_LENGTH }}
                                />
                            </Flex>
                        ))}
                    </Flex>
                </Box>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t('cancel')}
                textButtonApply={t('save')}
                onClickButtonCancel={onClose}
                loading={mutation.pending}
                propsButtonCancel={{ disabled: mutation.pending }}
                propsButtonApply={{ type: 'submit', form: formId, disabled: mutation.pending || invalid }}
            />
        </Dialog>
    );
}
