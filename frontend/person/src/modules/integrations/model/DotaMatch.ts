import type { DotaItem } from '@/modules/integrations/model/DotaItem';

export interface DotaMatch {
    readonly id: string;
    readonly matchUrl: string;
    readonly hero: string;
    readonly heroId: string;
    readonly heroIconUrl?: string;
    readonly heroImageUrl?: string;
    readonly result: 'victory' | 'defeat';
    readonly rank?: string;
    readonly score?: number;
    readonly opponentScore?: number;
    readonly kills: number;
    readonly deaths: number;
    readonly assists: number;
    readonly duration: string;
    readonly playedAt: string;
    readonly items: readonly DotaItem[];
    readonly heroDamage?: number;
    readonly buildingDamage?: number;
    readonly neutralItem?: DotaItem;
}
