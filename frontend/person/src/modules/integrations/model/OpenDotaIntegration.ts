import { personClient } from '@persons/person-domain/api/browser';
import { createElement } from 'react';
import { GameHistory } from '@/modules/integrations/components/GameHistory/GameHistory';
import type { GameIntegration } from '@/modules/integrations/model/GameIntegration';
import type { DotaMatch } from '@/modules/integrations/model/DotaMatch';
import { toDotaMatch } from '@/modules/integrations/model/toDotaMatch';
import { DotaMatchCard } from '@/modules/integrations/components/DotaMatchCard/DotaMatchCard';
import { DotaMatchDialog } from '@/modules/integrations/components/DotaMatchDialog/DotaMatchDialog';

export class OpenDotaIntegration implements GameIntegration<DotaMatch> {
    readonly shareKind = 'DOTA_MATCH';
    readonly id = 'opendota';
    readonly name = 'OpenDota';
    readonly icon = '/assets/integrations/dotabuff/dota-logo.svg';
    readonly empty = {
        illustration: '/media/empty-dota-lifestealer-vadim-v3.webp',
        title: 'emptyTitle',
        description: 'emptyDescription',
        alt: 'emptyArt',
    };
    readonly Card = DotaMatchCard;
    readonly Details = DotaMatchDialog;
    readonly History = ({
        personId,
        personTag,
        active,
    }: {
        readonly personId: string;
        readonly personTag?: string;
        readonly active: boolean;
    }) => createElement(GameHistory<DotaMatch>, { integration: this, personId, personTag, active });

    async loadOne(personId: string, matchId: string, signal: AbortSignal) {
        return toDotaMatch(await personClient.games.getDotaMatch({ id: personId, matchId }, { signal }));
    }

    async load(personId: string, page: number, signal: AbortSignal) {
        const result = await personClient.games.listDotaMatches({ id: personId, page, size: 12 }, { signal });
        return { ...result, items: result.items.map(toDotaMatch) };
    }
}
