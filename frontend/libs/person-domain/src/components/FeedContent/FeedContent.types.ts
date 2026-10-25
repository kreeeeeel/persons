import type { ReactNode } from "react";
import type { EmptyIllustrationKind } from "@persons/person-domain/EmptyIllustration/EmptyIllustration.types";

export interface FeedContentProps {
    readonly loading: boolean;
    readonly skeleton?: ReactNode;
    readonly error?: string;
    readonly retainContentOnError?: boolean;
    readonly empty: boolean;
    readonly emptyTitle: string;
    readonly emptyDescription: string;
    readonly illustration?: EmptyIllustrationKind;
    readonly emptyAction?: ReactNode;
    readonly onRetry: () => void;
    readonly children: ReactNode;
}
