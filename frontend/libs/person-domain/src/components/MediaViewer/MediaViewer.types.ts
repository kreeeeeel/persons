export interface MediaViewerProps {
    readonly mediaId: string;
    readonly personId: string;
    readonly personTag: string;
    readonly kind: "PHOTO" | "MOMENT";
    readonly signedIn: boolean;
    readonly publicUrl?: string;
    readonly onClose: () => void;
    readonly onNavigate?: (mediaId: string) => void;
    readonly onChanged?: () => void;
}
