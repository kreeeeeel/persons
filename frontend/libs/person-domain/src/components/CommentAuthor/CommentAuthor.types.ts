import type { Comment } from "@persons/person-client";
import type { ReactNode } from "react";

export interface CommentAuthorProps {
    readonly comment: Pick<
        Comment,
        | "authorName"
        | "authorTag"
        | "authorAvatarMediaId"
        | "authorAvatarUrl"
        | "authorId"
    >;
    readonly publicUrl?: string;
    readonly description?: ReactNode;
    readonly interactive?: boolean;
    readonly prominent?: boolean;
    readonly compactName?: boolean;
    readonly density?: "default" | "compact";
    readonly metadata?: ReactNode;
}
