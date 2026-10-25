import type { ReactNode } from "react";

export interface CommentComposerProps {
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly onSubmit: () => void;
    readonly pending: boolean;
    readonly media?: boolean;
    readonly inputLabel?: string;
    readonly placeholder?: string;
    readonly maxLength?: number;
    readonly submitLabel?: string;
    readonly showSubmitLabel?: boolean;
    readonly submitDisabled?: boolean;
    readonly allowEmpty?: boolean;
    readonly footerStart?: ReactNode;
    readonly beforeSubmit?: ReactNode;
}
