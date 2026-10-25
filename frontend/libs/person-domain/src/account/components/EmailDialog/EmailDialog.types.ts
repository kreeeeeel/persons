import type { AccountActions } from "@persons/person-domain/account/AccountActionsContext";
export interface EmailDialogProps {
    readonly embedded?: boolean;
    readonly actions: Pick<
        AccountActions,
        "beginEmailChange" | "confirmEmailChange" | "resendEmailCode"
    >;
    readonly email: string;
    readonly onClose: () => void;
}
