import type { PersonSearchPage } from "@persons/person-client";

export interface PersonSearchResultsProps {
    readonly id: string;
    readonly compact: boolean;
    readonly loading: boolean;
    readonly failed: boolean;
    readonly result?: PersonSearchPage;
    readonly active: number;
    readonly onActive: (index: number) => void;
    readonly onRetry: () => void;
    readonly onSelect: () => void;
}
