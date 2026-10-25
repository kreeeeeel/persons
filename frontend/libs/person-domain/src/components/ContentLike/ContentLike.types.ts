import type { ContentKind } from "@persons/person-client";

export interface ContentLikeProps {
    readonly kind: ContentKind;
    readonly id: string;
    readonly likes?: number;
    readonly liked?: boolean;
    readonly dislikes?: number;
    readonly disliked?: boolean;
    readonly signedIn: boolean;
    readonly disabled?: boolean;
}
