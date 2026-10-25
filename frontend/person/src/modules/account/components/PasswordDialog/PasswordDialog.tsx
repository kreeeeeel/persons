'use client';
import type { ComponentProps } from 'react';
import { PasswordDialog as SharedPasswordDialog } from '@persons/person-domain/account/components/PasswordDialog/PasswordDialog';
import { changePassword } from '@/modules/account/actions/settings';
export function PasswordDialog(props: Omit<ComponentProps<typeof SharedPasswordDialog>, 'changePassword'>) {
    return <SharedPasswordDialog {...props} changePassword={changePassword} />;
}
