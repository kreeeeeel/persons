'use client';
import { useTranslate } from '@persons/i18n';
import { ListFilterBar } from '@/shared/ui/ListFilterBar/ListFilterBar';
import { moderationOrders, moderationStatuses, moderationTypes } from '@/modules/moderation/model/filters';
import type { ModerationFiltersValue } from '@/modules/moderation/model/filters';

export function ModerationFilters({
    value,
    onApply,
}: {
    readonly value: ModerationFiltersValue;
    readonly onApply: (value: ModerationFiltersValue) => void;
}) {
    const t = useTranslate('moderation');
    const cms = useTranslate('cms');
    const update = (key: keyof ModerationFiltersValue, selected: string, name?: string) =>
        onApply({
            ...value,
            [key]: selected,
            ...(key === 'authorId' ? { authorName: name ?? '' } : key === 'personId' ? { personName: name ?? '' } : {}),
            page: 0,
        });
    return (
        <ListFilterBar
            search={value.q}
            onSearch={(q) => update('q', q)}
            placeholder={t('search')}
            fields={[
                {
                    key: 'status',
                    label: t('status'),
                    value: value.status,
                    defaultValue: 'ALL',
                    options: [...moderationStatuses].map((status) => ({
                        value: status,
                        content: status ? t(status) : t('allStatuses'),
                    })),
                    onChange: (selected) => update('status', selected || 'ALL'),
                },
                {
                    key: 'type',
                    label: t('type'),
                    value: value.type,
                    options: moderationTypes.map((type) => ({ value: type, content: t(type) })),
                    onChange: (selected) => update('type', selected),
                },
                {
                    key: 'order',
                    label: t('order'),
                    value: value.order,
                    defaultValue: 'OLDEST',
                    options: moderationOrders.map((order) => ({ value: order, content: t(order) })),
                    onChange: (selected) => update('order', selected || 'OLDEST'),
                },
                {
                    key: 'author',
                    label: cms('author'),
                    type: 'user',
                    value: value.authorId,
                    valueLabel: value.authorName,
                    onChange: (selected, name) => update('authorId', selected, name),
                },
                {
                    key: 'page',
                    label: cms('page'),
                    type: 'person',
                    value: value.personId,
                    valueLabel: value.personName,
                    onChange: (selected, name) => update('personId', selected, name),
                },
                {
                    key: 'from',
                    label: cms('periodFrom'),
                    type: 'date',
                    value: value.from,
                    max: value.to || undefined,
                    onChange: (selected) => update('from', selected),
                },
                {
                    key: 'to',
                    label: cms('periodTo'),
                    type: 'date',
                    value: value.to,
                    min: value.from || undefined,
                    onChange: (selected) => update('to', selected),
                },
            ]}
        />
    );
}
