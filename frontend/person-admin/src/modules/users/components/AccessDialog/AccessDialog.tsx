'use client';

import { useState, useTransition } from 'react';
import { Alert, Dialog, Flex, Select, Text } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import { updateAccess } from '@/modules/users/actions/access';
import type { AccessDialogProps } from '@/modules/users/components/AccessDialog/AccessDialog.types';

export function AccessDialog({ user, onClose, onSaved }: AccessDialogProps) {
    const t = useTranslate('admin');
    const [role, setRole] = useState(user.role);
    const [status, setStatus] = useState(user.status);
    const [error, setError] = useState<string>();
    const [pending, startTransition] = useTransition();

    function save() {
        startTransition(async () => {
            const result = await updateAccess({ id: user.id, role, status });

            if (result.ok) {
                onSaved();
            } else {
                setError(result.code);
            }
        });
    }

    return (
        <Dialog
            open
            onClose={() => {
                if (!pending) {
                    onClose();
                }
            }}
            maxWidth="s"
            fullWidth
            contentOverflow="auto"
        >
            <Dialog.Header caption={t('editAccess')} />
            <Dialog.Body>
                <Flex direction="column" gap="4">
                    <Text>
                        {user.firstName} {user.lastName} · {user.email}
                    </Text>
                    {error && <Alert theme="danger" message={t(error)} />}
                    <Text as="label" htmlFor="role">
                        {t('role')}
                    </Text>
                    <Select
                        id="role"
                        size="xl"
                        disabled={pending}
                        value={[role]}
                        onUpdate={([value]) => {
                            if (value === 'USER' || value === 'ADMIN') {
                                setRole(value);
                            }
                        }}
                        options={[
                            { value: 'USER', content: t('USER') },
                            { value: 'ADMIN', content: t('ADMIN') },
                        ]}
                    />
                    <Text as="label" htmlFor="status">
                        {t('status')}
                    </Text>
                    <Select
                        id="status"
                        size="xl"
                        disabled={pending}
                        value={[status]}
                        onUpdate={([value]) => {
                            if (value === 'ACTIVE' || value === 'BLOCKED') {
                                setStatus(value);
                            }
                        }}
                        options={[
                            { value: 'ACTIVE', content: t('ACTIVE') },
                            { value: 'BLOCKED', content: t('BLOCKED') },
                        ]}
                    />
                    <Text color="secondary">{t('accessHint')}</Text>
                </Flex>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t('cancel')}
                textButtonApply={t('save')}
                onClickButtonCancel={onClose}
                onClickButtonApply={save}
                loading={pending}
                propsButtonCancel={{ disabled: pending }}
            />
        </Dialog>
    );
}
