import type { AccountActions } from "@persons/person-domain/account/AccountActionsContext";
export interface AvatarDialogProps {
    readonly embedded?: boolean;
    readonly saveAvatar: AccountActions["changeAvatar"];
    readonly name: string;
    readonly current?: string;
    readonly onClose: () => void;
    readonly onSaved: (avatar: string) => void;
}
