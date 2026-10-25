import type { PersonProfile } from "@persons/person-client";

export interface PersonRestrictionsDialogProps {
    readonly profile: Pick<PersonProfile, "id" | "fullName">;
    readonly onClose: () => void;
    readonly onSaved: () => void;
    readonly onLinkAccount: () => void;
}
