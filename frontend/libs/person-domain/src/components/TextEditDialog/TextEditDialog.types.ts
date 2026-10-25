import type { ModerationReceipt } from "@persons/person-client";

export interface TextEditDialogProps {
    readonly title: string;
    readonly initial: string;
    readonly onSave: (text: string) => Promise<ModerationReceipt>;
    readonly onClose: () => void;
    readonly onSaved: (receipt: ModerationReceipt) => void;
}
