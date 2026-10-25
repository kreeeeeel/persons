import type { PersonSummary } from "@persons/person-client";

export interface TaggedPersonsButtonProps {
    readonly persons: readonly PersonSummary[];
    readonly publicUrl?: string;
}
