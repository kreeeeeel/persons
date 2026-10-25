import type { ComponentType } from 'react';

export interface GameIntegrationRegistration {
    readonly id: string;
    readonly name: string;
    readonly icon: string;
    readonly History: ComponentType<{
        readonly personId: string;
        readonly personTag?: string;
        readonly active: boolean;
    }>;
}
