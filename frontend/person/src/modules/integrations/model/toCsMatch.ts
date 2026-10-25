import type { CsMatch as ApiMatch } from '@persons/person-client';
import type { CsMatch } from '@/modules/integrations/model/CsMatch';

export function toCsMatch(match: ApiMatch): CsMatch {
    return { ...match, playedAt: match.playedAt.toISOString() };
}
