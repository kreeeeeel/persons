"use client";
import { createContext, useContext } from "react";
import type { AccountActionResult } from "@persons/person-domain/account/model/AccountActionResult";
import type { EmailChallenge } from "@persons/person-domain/account/model/EmailChallenge";
import type { SessionView } from "@persons/person-domain/account/model/SessionView";
export interface AccountActions {
    readonly changeProfile: (input: {
        firstName: string;
        lastName: string;
        patronymic?: string;
    }) => Promise<AccountActionResult>;
    readonly signOut: () => Promise<{ ok: boolean }>;
    readonly changeAvatar: (avatar: string) => Promise<AccountActionResult>;
    readonly changePassword: (input: {
        currentPassword: string;
        password: string;
        confirmation: string;
    }) => Promise<AccountActionResult>;
    readonly beginEmailChange: (input: {
        email: string;
        currentPassword: string;
        locale: string;
    }) => Promise<AccountActionResult<EmailChallenge>>;
    readonly confirmEmailChange: (
        id: string,
        code: string,
    ) => Promise<AccountActionResult>;
    readonly resendEmailCode: (
        id: string,
    ) => Promise<AccountActionResult<EmailChallenge>>;
    readonly listAccountSessions: () => Promise<
        AccountActionResult<SessionView[]>
    >;
    readonly endAccountSession: (
        id: string,
    ) => Promise<AccountActionResult<{ readonly current: boolean }>>;
    readonly endOtherAccountSessions: () => Promise<AccountActionResult>;
}
export const AccountActionsContext = createContext<AccountActions | null>(null);
export function useAccountActions(): AccountActions {
    const actions = useContext(AccountActionsContext);
    if (!actions) {
        throw new Error("Account actions provider is missing");
    }
    return actions;
}
