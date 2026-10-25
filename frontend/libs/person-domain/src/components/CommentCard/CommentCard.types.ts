import type { ReactNode } from "react";
import type { Comment } from "@persons/person-client";

export interface CommentCardProps {
    readonly comment: Comment;
    readonly signedIn: boolean;
    readonly publicUrl?: string;
    readonly compact?: boolean;
    readonly className?: string;
    readonly pending?: boolean;
    readonly editor?: ReactNode;
    readonly onEdit?: () => void;
    readonly onRemove?: () => void;
}
