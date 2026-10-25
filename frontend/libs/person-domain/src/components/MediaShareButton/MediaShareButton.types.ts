import type { ShareableMediaKind } from "@persons/person-domain/media/shareLink.types";

export interface MediaShareButtonProps {
    readonly personTag: string;
    readonly mediaId: string;
    readonly kind: ShareableMediaKind;
    readonly publicUrl?: string;
}
