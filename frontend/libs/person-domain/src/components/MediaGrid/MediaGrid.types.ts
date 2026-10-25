export interface MediaGridProps {
    readonly personId: string;
    readonly kind: "PHOTO" | "MOMENT";
    readonly signedIn: boolean;
    readonly publicUrl?: string;
    readonly personTag: string;
    readonly selectedMediaId?: string;
    readonly onOpenMedia?: (mediaId: string) => void;
    readonly onCloseMedia?: () => void;
}
