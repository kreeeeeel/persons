import type {
    Comment,
    CreditEntry,
    Moment,
    PersonAchievement,
    PersonRating,
    PersonSummary,
    Photo,
} from '@persons/person-client';
import type { DotaMatch } from '@/modules/integrations/model/DotaMatch';
import type { CsMatch } from '@/modules/integrations/model/CsMatch';

export type FeedKind = 'wall' | 'comment' | 'rating' | 'loan' | 'achievement' | 'moment' | 'photo' | 'game';

export type FeedEvent = {
    readonly id: string;
    readonly page: PersonSummary;
    readonly createdAt: Date;
} & (
    | {
          readonly kind: 'wall' | 'comment';
          readonly content: Comment;
          readonly contextMediaKind?: 'PHOTO' | 'MOMENT' | 'AVATAR';
      }
    | { readonly kind: 'rating'; readonly content: PersonRating }
    | { readonly kind: 'loan'; readonly content: CreditEntry }
    | { readonly kind: 'achievement'; readonly content: PersonAchievement }
    | { readonly kind: 'moment'; readonly content: Moment }
    | { readonly kind: 'photo'; readonly content: Photo }
    | { readonly kind: 'game'; readonly game?: 'dota2'; readonly content: DotaMatch }
    | { readonly kind: 'game'; readonly game: 'cs2'; readonly content: CsMatch }
);
