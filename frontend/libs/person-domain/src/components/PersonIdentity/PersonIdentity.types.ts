import type { PersonSummary } from "@persons/person-client";

export interface PersonIdentityProps {
    readonly person: PersonSummary;
    readonly size?: 24 | 30 | 36 | 44;
    readonly density?: "default" | "compact";
    readonly showTag?: boolean;
    readonly prominent?: boolean;
    readonly compactName?: boolean;
}
