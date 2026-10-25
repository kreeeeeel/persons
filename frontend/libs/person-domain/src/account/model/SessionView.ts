import type { Session } from "@persons/id-client";

export type SessionView = Omit<
    Session,
    "createdAt" | "lastSeenAt" | "expiresAt"
> & {
    readonly createdAt: string;
    readonly lastSeenAt: string;
    readonly expiresAt: string;
};
