const tiers: Readonly<Record<string, number>> = {
    herald: 1,
    guardian: 2,
    crusader: 3,
    archon: 4,
    legend: 5,
    ancient: 6,
    divine: 7,
    immortal: 8,
};

export function dotaRankImage(rank?: string): string {
    const name =
        rank
            ?.toLowerCase()
            .replace(/[\s_-]/g, '')
            .replace(/(?:[1-5]|iv|iii|ii|i|v)$/, '') ?? '';
    return `/assets/integrations/dotabuff/ranks/rank-${tiers[name] ?? 0}.png`;
}

export function dotaRankStars(rank?: string): string | undefined {
    const level = rank?.toLowerCase().match(/([1-5]|iv|iii|ii|i|v)$/)?.[1];
    const stars = level ? ({ i: 1, ii: 2, iii: 3, iv: 4, v: 5 }[level] ?? Number(level)) : 0;
    return stars >= 1 && stars <= 5 ? `/assets/integrations/dotabuff/ranks/stars-${stars}.png` : undefined;
}
