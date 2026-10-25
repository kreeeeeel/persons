import type { CsMatch as ApiMatch } from '@persons/person-client';

export interface CsMatch extends Omit<ApiMatch, 'playedAt'> {
    readonly playedAt: string;
}
