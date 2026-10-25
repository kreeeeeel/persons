import { createElement } from 'react';
import { personClient } from '@persons/person-domain/api/browser';
import { GameHistory } from '@/modules/integrations/components/GameHistory/GameHistory';
import { CsMatchCard } from '@/modules/integrations/components/CsMatchCard/CsMatchCard';
import { CsMatchDialog } from '@/modules/integrations/components/CsMatchDialog/CsMatchDialog';
import type { GameIntegration } from '@/modules/integrations/model/GameIntegration';
import type { CsMatch } from '@/modules/integrations/model/CsMatch';
import { toCsMatch } from '@/modules/integrations/model/toCsMatch';
import { LeetifyAttribution } from '@/modules/integrations/components/LeetifyAttribution/LeetifyAttribution';

export class LeetifyIntegration implements GameIntegration<CsMatch> {
    readonly shareKind = 'CS_MATCH';
    readonly id = 'leetify';
    readonly name = 'Leetify';
    readonly icon = '/assets/integrations/leetify/leetify-logo.svg';
    readonly Attribution = LeetifyAttribution;
    readonly empty = {
        illustration: '/media/empty-cs-sas-vadim-v2.webp',
        title: 'emptyTitle',
        description: 'csEmptyDescription',
        alt: 'csEmptyArt',
    };
    readonly Card = CsMatchCard;
    readonly Details = CsMatchDialog;
    readonly History = ({
        personId,
        personTag,
        active,
    }: {
        readonly personId: string;
        readonly personTag?: string;
        readonly active: boolean;
    }) => createElement(GameHistory<CsMatch>, { integration: this, personId, personTag, active });

    async loadOne(personId: string, matchId: string, signal: AbortSignal) {
        return toCsMatch(await personClient.games.getCsMatch({ id: personId, matchId }, { signal }));
    }

    async load(personId: string, page: number, signal: AbortSignal) {
        const result = await personClient.games.listCsMatches({ id: personId, page, size: 12 }, { signal });
        return { ...result, items: result.items.map(toCsMatch) };
    }
}
