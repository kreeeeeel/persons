import type { MediaReactionState } from "@persons/person-client";

export interface MediaReactionsProps {
    readonly mediaId: string;
    readonly initial: MediaReactionState;
    readonly signedIn: boolean;
    readonly disabled?: boolean;
}
