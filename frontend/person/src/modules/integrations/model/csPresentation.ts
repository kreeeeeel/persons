import { premierRankImage } from '@/modules/integrations/model/premierRankImage';
import type { CsMatch } from '@/modules/integrations/model/CsMatch';

const assets = '/assets/integrations/leetify';
const maps: Readonly<Record<string, string>> = {
    de_mirage: 'Mirage',
    de_inferno: 'Inferno',
    de_dust2: 'Dust II',
    de_nuke: 'Nuke',
    de_anubis: 'Anubis',
    de_ancient: 'Ancient',
    de_train: 'Train',
    de_overpass: 'Overpass',
    de_cache: 'Cache',
    de_vertigo: 'Vertigo',
};

export const csModeKeys = {
    COMPETITIVE: 'csCompetitive',
    PREMIER: 'csPremier',
    WINGMAN: 'csWingman',
    FACEIT: 'csFaceit',
    OTHER: 'csOther',
} as const;
export const csOutcomeKeys = { VICTORY: 'victory', DEFEAT: 'defeat', DRAW: 'draw' } as const;

export function csMapTitle(name: string): string {
    return maps[name] ?? name.replace(/^(de|cs|ar)_/, '').replaceAll('_', ' ');
}

export function csMapImage(name: string): string {
    return name in maps ? `${assets}/maps/${name}.svg` : `${assets}/maps/unknown.svg`;
}

export function csRankImage(match: CsMatch): string {
    if (match.mode === 'FACEIT') {
        return match.faceitLevel &&
            Number.isInteger(match.faceitLevel) &&
            match.faceitLevel >= 1 &&
            match.faceitLevel <= 10
            ? `${assets}/ranks/faceit-${match.faceitLevel}.png`
            : `${assets}/ranks/unknown.png`;
    }
    if (
        match.mode === 'PREMIER' &&
        match.rank &&
        Number.isInteger(match.rank) &&
        match.rank > 0 &&
        match.rank <= 99999
    ) {
        return premierRankImage(match.rank);
    }
    const rankType = match.mode === 'WINGMAN' ? 'wingman' : 'competitive';
    return match.rank && Number.isInteger(match.rank) && match.rank >= 1 && match.rank <= 18
        ? `${assets}/ranks/${rankType}-${match.rank}.png`
        : `${assets}/ranks/unknown.png`;
}

// Leetify's published frontend uses these 30/70 and 10/90 percentile boundaries.
export function personalPerformanceTone(value?: number): string {
    if (value === undefined) {
        return 'unknown';
    }
    const deviation = (100 * 0.178304176791) / Math.sqrt(19.89416305256038);
    const z = value / deviation;
    if (z < -1.28155) {
        return 'poor';
    }
    if (z < -0.5244) {
        return 'subpar';
    }
    if (z < 0.5244) {
        return 'average';
    }
    return z < 1.28155 ? 'good' : 'great';
}
