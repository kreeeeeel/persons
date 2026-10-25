export interface UserRestrictionDialogProps {
    readonly userId: string;
    readonly name: string;
    readonly onClose: () => void;
    readonly onSaved: () => void;
}
