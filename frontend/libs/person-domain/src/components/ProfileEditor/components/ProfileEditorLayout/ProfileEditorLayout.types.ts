import type { ReactNode } from "react";
import type { ProfileEditorSection } from "@persons/person-domain/ProfileEditor/ProfileEditor.types";

export interface ProfileEditorLayoutProps {
    readonly title: string;
    readonly section: ProfileEditorSection;
    readonly pending: boolean;
    readonly administrator?: boolean;
    readonly onSelect: (section: ProfileEditorSection) => void;
    readonly onSave: () => void;
    readonly onClose: () => void;
    readonly children: ReactNode;
}
