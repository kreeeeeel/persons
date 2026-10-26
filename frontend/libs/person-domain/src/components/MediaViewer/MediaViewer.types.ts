export interface MediaViewerProps {
    readonly mediaId: string;
    readonly personId: string;
    readonly personTag: string;
    readonly kind: "PHOTO" | "MOMENT";
    readonly signedIn: boolean;
    readonly publicUrl?: string;
    readonly mixedGallery?: boolean;
    readonly onClose: () => void;
    readonly onNavigate?: (mediaId: string, kind: "PHOTO" | "MOMENT") => void;
    readonly onChanged?: () => void;
}
