export const reviewFieldLabels: Record<string, string> = {
    firstName: 'firstName',
    lastName: 'lastName',
    patronymic: 'patronymic',
    tag: 'tag',
    description: 'description',
    tags: 'tags',
    searchKeywords: 'searchKeywords',
    socialLinks: 'socialLinks',
    ratingOptions: 'ratingOptions',
    text: 'comment',
    caption: 'caption',
    ownerId: 'owner',
    kind: 'entryType',
    message: 'proofMessage',
    accountId: 'accountId',
    taggedPersonIds: 'taggedPeople',
    taggedNames: 'taggedPeople',
};

function comparable(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '';
    }
    if (Array.isArray(value)) {
        return JSON.stringify(value.map(comparable));
    }
    if (typeof value === 'object') {
        return JSON.stringify(
            Object.entries(value as Record<string, unknown>)
                .filter(([, entry]) => entry !== undefined)
                .sort(([first], [second]) => first.localeCompare(second))
                .map(([key, entry]) => [key, comparable(entry)]),
        );
    }
    return String(value);
}

export function reviewChanges(proposed: Record<string, unknown>, previous?: Record<string, unknown>) {
    return Object.entries(proposed)
        .filter(
            ([key, value]) =>
                key in reviewFieldLabels &&
                !(key === 'searchKeywords' && value == null) &&
                !(key === 'taggedPersonIds' && Array.isArray(proposed.taggedNames)) &&
                (!previous || comparable(value) !== comparable(previous[key])),
        )
        .map(([key, after]) => ({ key, before: previous?.[key], after }));
}
