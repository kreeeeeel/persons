'use client';
import type { ReactNode } from 'react';
import { AccountActionsContext } from '@persons/person-domain/account/AccountActionsContext';
import { signOut } from '@/modules/account/actions/signOut';
import { changeAvatar } from '@/modules/account/actions/changeAvatar';
import {
    changeProfile,
    changePassword,
    beginEmailChange,
    confirmEmailChange,
    resendEmailCode,
} from '@/modules/account/actions/settings';
import { listAccountSessions, endAccountSession, endOtherAccountSessions } from '@/modules/account/actions/sessions';
const actions = {
    signOut,
    changeAvatar,
    changeProfile,
    changePassword,
    beginEmailChange,
    confirmEmailChange,
    resendEmailCode,
    listAccountSessions,
    endAccountSession,
    endOtherAccountSessions,
};
export function AccountActionsProvider({ children }: { readonly children: ReactNode }) {
    return <AccountActionsContext value={actions}>{children}</AccountActionsContext>;
}
