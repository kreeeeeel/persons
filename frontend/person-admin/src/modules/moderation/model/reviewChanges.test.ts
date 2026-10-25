import { expect, it } from 'vitest';
import { reviewChanges } from '@/modules/moderation/model/reviewChanges';

it('shows only changed editable fields, including categories and search names', () => {
    const previous = {
        firstName: 'Кирилл',
        tags: ['друзья'],
        searchKeywords: [],
        ratingOptions: [{ emoji: '🔥', label: 'Огонь' }],
        version: 1,
    };
    expect(
        reviewChanges(
            { ...previous, firstName: 'Крел', tags: ['коллеги'], searchKeywords: ['Кирилл Крел'], version: 2 },
            previous,
        ),
    ).toEqual([
        { key: 'firstName', before: 'Кирилл', after: 'Крел' },
        { key: 'tags', before: ['друзья'], after: ['коллеги'] },
        { key: 'searchKeywords', before: [], after: ['Кирилл Крел'] },
    ]);
});

it('treats preserved optional values and equivalent object property orders as unchanged', () => {
    expect(
        reviewChanges(
            { patronymic: '', searchKeywords: null, ratingOptions: [{ label: 'Огонь', emoji: '🔥' }] },
            {
                patronymic: null,
                searchKeywords: ['Крел'],
                ratingOptions: [{ emoji: '🔥', label: 'Огонь' }],
            },
        ),
    ).toEqual([]);
});

it('does not invent original values for a legacy request', () => {
    expect(reviewChanges({ text: 'Предлагаемый текст' })).toEqual([
        { key: 'text', before: undefined, after: 'Предлагаемый текст' },
    ]);
});
