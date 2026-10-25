export interface OwnershipDialogProps {
    readonly personId: string;
    readonly onClose: () => void;
    readonly onSaved: () => void;
}
