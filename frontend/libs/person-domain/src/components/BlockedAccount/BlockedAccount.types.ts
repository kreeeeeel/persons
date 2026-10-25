import type { AccountRestriction } from "@persons/person-client";

export interface BlockedAccountProps {
    readonly restriction: AccountRestriction;
    readonly signOut: () => Promise<{ readonly ok: boolean }>;
    readonly homeUrl: string;
}
