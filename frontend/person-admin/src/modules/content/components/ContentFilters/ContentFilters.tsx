'use client';
import { useTranslate } from '@persons/i18n';
import { ListFilterBar } from '@/shared/ui/ListFilterBar/ListFilterBar';
import { contentOrders, contentStatuses, contentTypes } from '@/modules/content/model/filters';
import type { ContentFiltersValue } from '@/modules/content/model/filters';

export function ContentFilters({
    value,
    onApply,
}: {
    readonly value: ContentFiltersValue;
    readonly onApply: (value: ContentFiltersValue) => void;
}) {
    const t = useTranslate('content');
    const cms = useTranslate('cms');
    const update = (key: keyof ContentFiltersValue, selected: string, name?: string) =>
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
                    options: ['', ...contentStatuses].map((status) => ({
                        value: status,
                        content: status ? t(status) : t('ALL'),
                    })),
                    onChange: (selected) => update('status', selected || ''),
                },
                {
                    key: 'type',
                    label: t('type'),
                    value: value.type,
                    options: contentTypes.map((type) => ({ value: type, content: t(type) })),
                    onChange: (selected) => update('type', selected),
                },
                {
                    key: 'order',
                    label: t('order'),
                    value: value.order,
                    defaultValue: 'NEWEST',
                    options: contentOrders.map((order) => ({ value: order, content: t(order) })),
                    onChange: (selected) => update('order', selected || 'NEWEST'),
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
