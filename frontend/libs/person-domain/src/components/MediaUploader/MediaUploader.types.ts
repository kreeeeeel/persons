import type { MediaKind, ModerationReceipt } from "@persons/person-client";

export interface MediaUploaderProps {
    readonly personId: string;
    readonly kind: MediaKind;
    readonly onClose: () => void;
    readonly onSaved: (receipt: ModerationReceipt) => void;
}
