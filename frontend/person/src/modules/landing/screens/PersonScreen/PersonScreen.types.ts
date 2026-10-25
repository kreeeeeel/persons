import type { ReactNode } from 'react';

export interface PersonScreenProps {
    readonly account: ReactNode;
    readonly signedIn?: boolean;
    readonly loading?: boolean;
}
