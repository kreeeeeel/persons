import { expect, it } from 'vitest';
import { dotaRankLabel } from '@/modules/integrations/model/dotaRankLabel';
import { integrationMessages } from '@/modules/integrations/model/integrationMessages';

it.each([
    ['Herald 1', 'Рекрут I', 'Herald I'],
    ['Guardian II', 'Страж II', 'Guardian II'],
    ['Crusader 3', 'Рыцарь III', 'Crusader III'],
    ['Archon 4', 'Герой IV', 'Archon IV'],
    ['legend4', 'Легенда IV', 'Legend IV'],
    ['Ancient V', 'Властелин V', 'Ancient V'],
    ['Divine 2', 'Божество II', 'Divine II'],
    ['Immortal', 'Титан', 'Immortal'],
] as const)('localizes player medal %s in both locales', (rank, ru, en) => {
    for (const [locale, expected] of [
        ['ru', ru],
        ['en', en],
    ] as const) {
        const messages: Readonly<Record<string, string>> = integrationMessages[locale];
        expect(dotaRankLabel(rank, (key) => messages[key])).toBe(expected);
    }
});

it('shows unavailable for missing or unrecognized player ranks', () => {
    const messages: Readonly<Record<string, string>> = integrationMessages.ru;
    expect(dotaRankLabel(undefined, (key) => messages[key])).toBe('Ранг не указан');
    expect(dotaRankLabel('average 4000 MMR', (key) => messages[key])).toBe('Ранг не указан');
});
