import type { Session, User } from '@persons/id-client';

export interface AccountScreenProps {
    readonly user: User;
    readonly sessions: readonly (Omit<Session, 'createdAt' | 'lastSeenAt' | 'expiresAt'> & {
        createdAt: string;
        lastSeenAt: string;
        expiresAt: string;
    })[];
}
