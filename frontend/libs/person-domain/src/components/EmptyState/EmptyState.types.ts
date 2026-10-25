import type { ReactNode } from "react";
import type { EmptyIllustrationKind } from "@persons/person-domain/EmptyIllustration/EmptyIllustration.types";

export interface EmptyStateProps {
    readonly illustration: EmptyIllustrationKind;
    readonly title?: string;
    readonly description?: string;
    readonly action?: ReactNode;
    readonly compact?: boolean;
}
