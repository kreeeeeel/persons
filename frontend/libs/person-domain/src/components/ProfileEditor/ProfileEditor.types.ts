import type {
    ModerationReceipt,
    PersonProfile,
    ProfileInput,
} from "@persons/person-client";

export interface ProfileEditorFieldsProps {
    readonly draft: ProfileInput;
    readonly disabled: boolean;
    readonly onChange: (draft: ProfileInput) => void;
}

export type ProfileEditorSection =
    | "main"
    | "avatar"
    | "account"
    | "description"
    | "army"
    | "presence"
    | "search"
    | "social";

export interface ProfileEditorProps {
    readonly profile?: PersonProfile;
    readonly ownRequest?: boolean;
    readonly administrator?: boolean;
    readonly onClose: () => void;
    readonly onSaved: (receipt: ModerationReceipt, tag?: string) => void;
}
