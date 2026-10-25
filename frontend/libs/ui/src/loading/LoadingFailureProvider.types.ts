import type { ReactNode } from 'react';

export interface LoadingFailureProviderProps {
    readonly children: ReactNode;
    readonly title: string;
    readonly description: string;
    readonly acknowledge: string;
    readonly illustrationAlt: string;
    readonly illustrationSrc: string;
}
