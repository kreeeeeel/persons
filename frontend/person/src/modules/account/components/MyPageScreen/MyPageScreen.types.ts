import type { ReactNode } from 'react';

export interface MyPageScreenProps {
    readonly account: ReactNode;
    readonly pending: boolean;
}
