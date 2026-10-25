import type { FeedSort } from "@persons/person-client";

export interface FeedSortControlProps {
    readonly value: FeedSort;
    readonly onChange: (value: FeedSort) => void;
    readonly compact?: boolean;
    readonly mine?: boolean;
    readonly onMineChange?: (mine: boolean) => void;
}
