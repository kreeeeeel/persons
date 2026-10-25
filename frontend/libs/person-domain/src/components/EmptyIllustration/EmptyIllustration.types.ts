export type EmptyIllustrationKind =
    | "wall"
    | "comments"
    | "ratings"
    | "photos"
    | "media"
    | "history"
    | "achievements"
    | "notifications"
    | "search"
    | "sessions"
    | "restrictions"
    | "publications"
    | "moderation"
    | "settings"
    | "my-page";

export interface EmptyIllustrationProps {
    readonly kind: EmptyIllustrationKind;
}
