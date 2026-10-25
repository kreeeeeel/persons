'use client';
import type { ComponentProps } from 'react';
import { AccountMenu as SharedAccountMenu } from '@persons/person-domain/account/components/AccountMenu/AccountMenu';
import { AccountActionsProvider } from '@/modules/account/components/AccountActionsProvider/AccountActionsProvider';
export function AccountMenu(props: ComponentProps<typeof SharedAccountMenu>) {
    return (
        <AccountActionsProvider>
            <SharedAccountMenu {...props} />
        </AccountActionsProvider>
    );
}
