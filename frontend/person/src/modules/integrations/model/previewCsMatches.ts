import type { CsMatch } from '@/modules/integrations/model/CsMatch';

// Design fixtures only; these are not the person's actual matches.
export const previewCsMatches: readonly CsMatch[] = Array.from({ length: 18 }, (_, index) => {
    const mode = (['PREMIER', 'FACEIT', 'WINGMAN', 'COMPETITIVE'] as const)[index % 4];
    const outcome = (['VICTORY', 'DEFEAT', 'DRAW', 'VICTORY'] as const)[index % 4];
    const kills = 24 - (index % 10);
    const deaths = 14 + (index % 5);
    return {
        id: `00000000-0000-4000-a000-${String(index + 1).padStart(12, '0')}`,
        mapName: ['de_mirage', 'de_inferno', 'de_nuke', 'de_ancient', 'de_dust2', 'de_anubis'][index % 6],
        matchUrl: `https://leetify.com/app/match-details/00000000-0000-4000-a000-${String(index + 1).padStart(12, '0')}`,
        mode,
        outcome,
        score: outcome === 'VICTORY' ? 13 : 9,
        opponentScore: outcome === 'DEFEAT' ? 13 : 9,
        kills,
        deaths,
        assists: 7 + (index % 4),
        durationSeconds: index === 4 ? undefined : 2134 + index * 57,
        rank: mode === 'FACEIT' ? undefined : mode === 'PREMIER' ? 18500 + index * 24 : 16,
        faceitLevel: mode === 'FACEIT' ? 9 : undefined,
        faceitElo: mode === 'FACEIT' ? 2450 + index * 12 : undefined,
        kd: Number((kills / deaths).toFixed(2)),
        adr: 95.3 - index * 1.1,
        hsPercent: 58.33 - (index % 8),
        leetifyRating: 0.0432,
        personalPerformance: index === 4 ? undefined : [4.2, -7.3, 0.8, 8.4, -3.1][index % 5],
        playedAt: new Date(Date.parse('2026-10-22T20:42:00Z') - index * 3_600_000).toISOString(),
    };
});
