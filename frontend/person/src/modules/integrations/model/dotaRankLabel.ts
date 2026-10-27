const ranks: Readonly<Record<string, string>> = {
    herald: 'rankHerald',
    guardian: 'rankGuardian',
    crusader: 'rankCrusader',
    archon: 'rankArchon',
    legend: 'rankLegend',
    ancient: 'rankAncient',
    divine: 'rankDivine',
    immortal: 'rankImmortal',
};

export function dotaRankLabel(rank: string | undefined, translate: (key: string) => string): string {
    const parsed = rank
        ?.trim()
        .match(/^(herald|guardian|crusader|archon|legend|ancient|divine|immortal)[\s_-]*([1-5]|IV|III|II|I|V)?$/i);
    if (!parsed) {
        return translate('unknownRank');
    }
    const name = parsed[1].toLowerCase();
    const level = parsed[2]?.toLowerCase();
    const stars = level ? ({ i: 1, ii: 2, iii: 3, iv: 4, v: 5 }[level] ?? Number(level)) : undefined;
    const roman = stars ? ['I', 'II', 'III', 'IV', 'V'][stars - 1] : undefined;
    return `${translate(ranks[name])}${name !== 'immortal' && roman ? ` ${roman}` : ''}`;
}
