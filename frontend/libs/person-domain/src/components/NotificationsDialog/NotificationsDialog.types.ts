export interface NotificationsDialogProps {
    readonly publicUrl?: string;
    readonly onClose: () => void;
    readonly onRead?: () => void;
}
