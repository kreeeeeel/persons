'use client';

import { useCallback } from 'react';
import { personClient } from '@persons/person-domain/api/browser';
import { usePersonData } from '@persons/person-domain/hooks/usePersonData';
import { ListTable } from '@/shared/ui/ListTable/ListTable';
import { ReviewCard } from '@/modules/person/components/ReviewCard/ReviewCard';
import { useTranslate } from '@persons/i18n';

export function PendingContentReview({
    id,
    publicUrl,
    onSaved,
    onBusy,
}: {
    readonly id: string;
    readonly publicUrl: string;
    readonly onSaved: () => void;
    readonly onBusy: (value: boolean) => void;
}) {
    const t = useTranslate('content');
    const load = useCallback((signal: AbortSignal) => personClient.admin.getModeration({ id }, { signal }), [id]);
    const resource = usePersonData(`request:${id}`, load);
    return (
        <ListTable
            title={t('reviewTitle')}
            loading={resource.loading}
            error={resource.error}
            empty={false}
            emptyTitle={t('emptyTitle')}
            emptyDescription={t('emptyDescription')}
            illustration="moderation"
            retry={resource.refresh}
        >
            {resource.data && (
                <ReviewCard item={resource.data} publicUrl={publicUrl} onSaved={onSaved} onPendingChange={onBusy} />
            )}
        </ListTable>
    );
}
