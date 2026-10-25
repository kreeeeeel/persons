import type { SessionView } from "@persons/person-domain/account/model/SessionView";

export interface SessionCardProps {
    readonly session: SessionView;
    readonly pending: boolean;
    readonly onRevoke: () => void;
}
