import type { DotaMatch as ApiMatch } from '@persons/person-client';
import type { DotaMatch } from '@/modules/integrations/model/DotaMatch';

export function toDotaMatch(match: ApiMatch): DotaMatch {
    const minutes = Math.floor(match.durationSeconds / 60);
    const seconds = match.durationSeconds % 60;
    return {
        id: match.id,
        matchUrl: match.matchUrl,
        hero: match.hero,
        heroId: match.heroId,
        heroIconUrl: match.heroIconUrl,
        heroImageUrl: match.heroImageUrl,
        result: match.won ? 'victory' : 'defeat',
        rank: match.rank,
        score: match.score,
        opponentScore: match.opponentScore,
        kills: match.kills,
        deaths: match.deaths,
        assists: match.assists,
        duration: `${minutes}:${String(seconds).padStart(2, '0')}`,
        playedAt: match.playedAt.toISOString(),
        items: match.items,
        heroDamage: match.heroDamage,
        buildingDamage: match.buildingDamage,
        neutralItem: match.neutralItem,
    };
}
