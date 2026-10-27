import { expect, it } from 'vitest';
import { reviewChanges } from '@/modules/moderation/model/reviewChanges';

it('shows contact status changes and explicit clearing while preserving omitted presence', () => {
    const previous = { presence: { status: 'MISSING', since: '2026-01-01' } };
    expect(reviewChanges({ presence: { status: 'UNRESPONSIVE', since: '2026-01-01' } }, previous)).toEqual([
        { key: 'presenceStatus', before: 'MISSING', after: 'UNRESPONSIVE' },
    ]);
    expect(reviewChanges({ presence: {} }, previous)).toEqual([
        { key: 'presenceStatus', before: 'MISSING', after: undefined },
        { key: 'presenceSince', before: '2026-01-01', after: undefined },
    ]);
    expect(reviewChanges({}, previous)).toEqual([]);
});

it('shows changed and cleared calendar dates separately and preserves omitted dates', () => {
    const previous = { dates: { birthDate: '2001-05-14', militaryDepartureDate: '2026-06-01' } };
    expect(
        reviewChanges({ dates: { birthDate: '2001-05-14', militaryDepartureDate: '2026-07-01' } }, previous),
    ).toEqual([{ key: 'militaryDepartureDate', before: '2026-06-01', after: '2026-07-01' }]);
    expect(reviewChanges({ dates: {} }, previous)).toEqual([
        { key: 'birthDate', before: '2001-05-14', after: undefined },
        { key: 'militaryDepartureDate', before: '2026-06-01', after: undefined },
    ]);
    expect(reviewChanges({}, previous)).toEqual([]);
});

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
