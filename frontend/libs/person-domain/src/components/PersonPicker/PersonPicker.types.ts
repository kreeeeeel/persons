import type { PersonSummary } from "@persons/person-client";

export interface PersonPickerProps {
    readonly value: readonly PersonSummary[];
    readonly onChange: (people: PersonSummary[]) => void;
    readonly label?: string;
    readonly disabled?: boolean;
    readonly limit?: number;
}
