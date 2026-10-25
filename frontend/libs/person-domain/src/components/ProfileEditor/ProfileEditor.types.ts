import type { ModerationReceipt, PersonProfile } from "@persons/person-client";

export interface ProfileEditorProps {
    readonly profile?: PersonProfile;
    readonly ownRequest?: boolean;
    readonly administrator?: boolean;
    readonly onClose: () => void;
    readonly onSaved: (receipt: ModerationReceipt, tag?: string) => void;
}
