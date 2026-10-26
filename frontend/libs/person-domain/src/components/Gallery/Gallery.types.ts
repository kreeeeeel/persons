export interface GalleryProps {
    readonly personId: string;
    readonly personTag: string;
    readonly signedIn: boolean;
    readonly publicUrl?: string;
    readonly selectedMedia?: {
        readonly id: string;
        readonly kind: "PHOTO" | "MOMENT";
    };
    readonly onOpenMedia?: (kind: "PHOTO" | "MOMENT", id: string) => void;
    readonly onCloseMedia?: () => void;
}
