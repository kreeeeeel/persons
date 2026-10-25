import type { MediaDetail, ModerationReceipt } from "@persons/person-client";

export interface MediaEditorProps {
    readonly detail: MediaDetail;
    readonly onClose: () => void;
    readonly onSaved: (receipt: ModerationReceipt) => void;
}
