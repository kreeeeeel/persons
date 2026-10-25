export interface ConfirmRemovalDialogProps {
    readonly onClose: () => void;
    readonly onConfirm: () => void;
    readonly pending?: boolean;
    readonly title?: string;
    readonly description?: string;
    readonly confirmLabel?: string;
}
