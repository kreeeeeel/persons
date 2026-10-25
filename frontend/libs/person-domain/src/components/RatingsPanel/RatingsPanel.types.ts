import type { RatingOption, RatingState } from "@persons/person-client";
export interface RatingsPanelProps {
    readonly personId: string;
    readonly signedIn: boolean;
    readonly initialOptions: RatingOption[];
    readonly initialRating?: RatingState;
    readonly onChange: () => void;
    readonly publicUrl?: string;
}
