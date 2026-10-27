import {
    Camera,
    Clock,
    Comment,
    Globe,
    Link,
    Magnifier,
    Person,
} from "@gravity-ui/icons";
import type { ProfileEditorSection } from "@persons/person-domain/ProfileEditor/ProfileEditor.types";

export const profileEditorSections = [
    { id: "main", icon: Person },
    { id: "avatar", icon: Camera },
    { id: "account", icon: Link },
    { id: "description", icon: Comment },
    { id: "army", icon: Clock },
    { id: "presence", icon: Comment },
    { id: "search", icon: Magnifier },
    { id: "social", icon: Globe },
] as const;

export const profileEditorGroups = [
    { id: "page", sections: ["main", "avatar", "account", "description"] },
    { id: "status", sections: ["army", "presence"] },
    { id: "contacts", sections: ["search", "social"] },
] as const satisfies readonly {
    readonly id: string;
    readonly sections: readonly ProfileEditorSection[];
}[];
