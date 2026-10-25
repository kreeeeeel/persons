'use client';
import type { ModerationFilterStatus, ModerationStatistics } from '@persons/person-client';
import { useTranslate } from '@persons/i18n';
import { MetricSummary } from '@/shared/ui/MetricSummary/MetricSummary';

export function ModerationMetrics({
    value,
    selected,
    onSelect,
}: {
    readonly value?: ModerationStatistics;
    readonly selected: ModerationFilterStatus;
    readonly onSelect: (status: ModerationFilterStatus) => void;
}) {
    const t = useTranslate('moderation');
    return (
        <MetricSummary
            items={[
                {
                    key: 'pending',
                    label: t('pendingMetric'),
                    count: value?.pending,
                    selected: selected === 'PENDING',
                    onClick: () => onSelect('PENDING'),
                },
                {
                    key: 'approved',
                    label: t('approvedMetric'),
                    count: value?.approved,
                    selected: selected === 'APPROVED',
                    onClick: () => onSelect('APPROVED'),
                },
                {
                    key: 'rejected',
                    label: t('rejectedMetric'),
                    count: value?.rejected,
                    selected: selected === 'REJECTED',
                    onClick: () => onSelect('REJECTED'),
                },
                { key: 'overdue', label: t('overdueMetric'), count: value?.overdue },
            ]}
        />
    );
}
