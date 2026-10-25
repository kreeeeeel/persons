import type { MediaDetail } from "@persons/person-client";

export interface MediaViewerContentProps {
    readonly detail: MediaDetail;
    readonly personTag: string;
    readonly signedIn: boolean;
    readonly publicUrl?: string;
    readonly onClose: () => void;
    readonly onRefresh: () => void;
    readonly onChanged?: () => void;
}
