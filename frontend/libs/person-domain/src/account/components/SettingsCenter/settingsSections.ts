import {
    Camera,
    Clock,
    Envelope,
    Lock,
    Palette,
    Person,
    Play,
} from "@gravity-ui/icons";

export const settingsSections = [
    { id: "profile", icon: Person },
    { id: "avatar", icon: Camera },
    { id: "interface", icon: Palette },
    { id: "player", icon: Play },
    { id: "email", icon: Envelope },
    { id: "password", icon: Lock },
    { id: "sessions", icon: Clock },
    { id: "restrictions", icon: Lock },
] as const;

export type SettingsSectionId = (typeof settingsSections)[number]["id"];

export const settingsGroups = [
    { id: "account", sections: ["profile", "avatar"] },
    { id: "application", sections: ["interface", "player"] },
    {
        id: "privacy",
        sections: ["email", "password", "sessions", "restrictions"],
    },
] as const satisfies readonly {
    readonly id: string;
    readonly sections: readonly SettingsSectionId[];
}[];
