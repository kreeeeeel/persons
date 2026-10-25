import type { AccountActions } from "@persons/person-domain/account/AccountActionsContext";
export interface PasswordDialogProps {
    readonly embedded?: boolean;
    readonly changePassword: AccountActions["changePassword"];
    readonly onClose: () => void;
}
