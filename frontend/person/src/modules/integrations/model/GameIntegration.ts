import type { ComponentType } from 'react';
import type { GameIntegrationRegistration } from '@/modules/integrations/model/GameIntegrationRegistration';

export interface GameIntegration<
    Event extends { readonly id: string; readonly playedAt: string },
> extends GameIntegrationRegistration {
    readonly id: string;
    readonly name: string;
    readonly icon: string;
    readonly shareKind: 'DOTA_MATCH' | 'CS_MATCH';
    readonly Attribution?: ComponentType;
    readonly empty: {
        readonly illustration: string;
        readonly title: string;
        readonly description: string;
        readonly alt: string;
    };
    readonly Card: ComponentType<{ readonly match: Event; readonly onOpen: () => void }>;
    readonly Details: ComponentType<{
        readonly match: Event;
        readonly onClose: () => void;
        readonly personTag?: string;
    }>;
    loadOne(personId: string, matchId: string, signal: AbortSignal): Promise<Event>;
    load(
        personId: string,
        page: number,
        signal: AbortSignal,
    ): Promise<{
        readonly items: Event[];
        readonly page: number;
        readonly size: number;
        readonly total: number;
    }>;
}
