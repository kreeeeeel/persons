'use client';
import type { ComponentProps } from 'react';
import { EmailDialog as SharedEmailDialog } from '@persons/person-domain/account/components/EmailDialog/EmailDialog';
import { beginEmailChange, confirmEmailChange, resendEmailCode } from '@/modules/account/actions/settings';
export function EmailDialog(props: Omit<ComponentProps<typeof SharedEmailDialog>, 'actions'>) {
    return <SharedEmailDialog {...props} actions={{ beginEmailChange, confirmEmailChange, resendEmailCode }} />;
}
