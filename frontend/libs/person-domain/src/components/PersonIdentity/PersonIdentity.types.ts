import type { PersonSummary } from "@persons/person-client";

export interface PersonIdentityProps {
    readonly person: PersonSummary;
    readonly size?: 24 | 36 | 44;
    readonly showTag?: boolean;
    readonly prominent?: boolean;
    readonly compactName?: boolean;
}
