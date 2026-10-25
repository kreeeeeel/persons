'use client';
import { InfiniteFeedLoader } from '@persons/person-domain/InfiniteFeedLoader';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Flex } from '@gravity-ui/uikit';
import type { Decision, ModerationItem } from '@persons/person-client';
import { useTranslate } from '@persons/i18n';
import { personClient } from '@persons/person-domain/api/browser';
import { useInfinitePersonData } from '@persons/person-domain/hooks/useInfinitePersonData';
import { ListPageHeader } from '@/shared/ui/ListPageHeader/ListPageHeader';
import { SelectionToolbar } from '@/shared/ui/SelectionToolbar/SelectionToolbar';
import { ListTable } from '@/shared/ui/ListTable/ListTable';
import { moderationFilterParams, moderationRequest, readModerationFilters } from '@/modules/moderation/model/filters';
import type { ModerationFiltersValue } from '@/modules/moderation/model/filters';
import { ModerationFilters } from '@/modules/moderation/components/ModerationFilters/ModerationFilters';
import { ModerationMetrics } from '@/modules/moderation/components/ModerationMetrics/ModerationMetrics';
import { ModerationTable } from '@/modules/moderation/components/ModerationTable/ModerationTable';
import { ModerationReviewDialog } from '@/modules/moderation/components/ModerationReviewDialog/ModerationReviewDialog';
import { ModerationBulkDialog } from '@/modules/moderation/components/ModerationBulkDialog/ModerationBulkDialog';
import type { ModerationBulkResult } from '@/modules/moderation/components/ModerationBulkDialog/ModerationBulkDialog';
import styles from '@/modules/person/components/ModerationScreen/ModerationScreen.module.css';

export function ModerationScreen({ publicUrl }: { readonly publicUrl: string }) {
    const t = useTranslate('moderation');
    const cms = useTranslate('cms');
    const router = useRouter();
    const pathname = usePathname();
    const search = useSearchParams()?.toString() ?? '';
    const filters = useMemo(() => readModerationFilters(new URLSearchParams(search)), [search]);
    const request = useMemo(() => moderationRequest(filters), [filters]);
    const key = JSON.stringify(request);
    const load = useCallback(
        (page: number, signal: AbortSignal) => personClient.admin.listModeration({ ...request, page }, { signal }),
        [request],
    );
    const resource = useInfinitePersonData(`moderation:${key}`, load);
    const items = resource.data?.items ?? [];
    const [selection, setSelection] = useState<{ key: string; ids: string[] }>({ key, ids: [] });
    const selected =
        selection.key === key
            ? selection.ids.filter((id) => items.some((item) => item.id === id && item.status === 'PENDING'))
            : [];
    const [viewed, setViewed] = useState<ModerationItem>();
    const [bulkDecision, setBulkDecision] = useState<Decision>();
    const [notice, setNotice] = useState<{ message: string; failed: boolean }>();

    const update = useCallback(
        (value: ModerationFiltersValue) => {
            const params = moderationFilterParams(value).toString();
            router.replace(`${pathname}${params ? `?${params}` : ''}`, { scroll: false });
        },
        [pathname, router],
    );

    function saved() {
        setNotice({ message: t('decisionSaved'), failed: false });
        const position = items.findIndex((item) => item.id === viewed?.id);
        setViewed(items.slice(position + 1).find((item) => item.status === 'PENDING'));
        resource.refresh();
    }

    function bulkSaved(result: ModerationBulkResult) {
        setBulkDecision(undefined);
        setSelection({ key, ids: result.failed });
        setNotice({
            failed: result.failed.length > 0,
            message: result.failed.length
                ? t('bulkPartial', { success: result.success.length, failed: result.failed.length })
                : t('bulkSuccess', { count: result.success.length }),
        });
        resource.refresh();
    }

    const unfiltered =
        !filters.q && !filters.type && !filters.authorId && !filters.personId && !filters.from && !filters.to;
    const emptyQueue = filters.status === 'PENDING' && unfiltered;
    return (
        <Flex direction="column" gap="5" className={styles.screen}>
            <ListPageHeader
                title={t('title')}
                description={t('description')}
                action={
                    <Button size="l" view="outlined" loading={resource.refreshing} onClick={resource.refresh}>
                        {t('refresh')}
                    </Button>
                }
            />
            <ModerationMetrics
                value={resource.data?.statistics}
                selected={filters.status}
                onSelect={(status) => update({ ...filters, status, page: 0 })}
            />
            <ModerationFilters value={filters} onApply={update} />
            {notice && (
                <Alert
                    theme={notice.failed ? 'danger' : 'success'}
                    align="center"
                    message={notice.message}
                    onClose={() => setNotice(undefined)}
                />
            )}
            <SelectionToolbar
                count={selected.length}
                total={resource.data?.total ?? 0}
                onSelectAll={() =>
                    setSelection({ key, ids: items.filter((item) => item.status === 'PENDING').map((item) => item.id) })
                }
                onClear={() => setSelection({ key, ids: [] })}
            >
                <Button view="flat" disabled={!selected.length} onClick={() => setBulkDecision('APPROVE')}>
                    {cms('approve')}
                </Button>
                <Button view="flat-danger" disabled={!selected.length} onClick={() => setBulkDecision('REJECT')}>
                    {cms('reject')}
                </Button>
            </SelectionToolbar>
            <ListTable
                title={t('title')}
                loading={resource.loading}
                error={resource.error}
                retry={resource.refresh}
                empty={!items.length}
                emptyTitle={t(emptyQueue ? 'queueEmpty' : 'emptyTitle')}
                emptyDescription={t(emptyQueue ? 'queueEmptyDescription' : 'emptyDescription')}
                illustration="moderation"
            >
                <ModerationTable
                    items={items}
                    publicUrl={publicUrl}
                    selected={selected}
                    onSelection={(ids) => setSelection({ key, ids })}
                    onOpen={setViewed}
                />
            </ListTable>
            <InfiniteFeedLoader {...resource} />
            {viewed && (
                <ModerationReviewDialog
                    item={items.find((item) => item.id === viewed.id) ?? viewed}
                    items={items}
                    publicUrl={publicUrl}
                    onClose={() => setViewed(undefined)}
                    onNavigate={setViewed}
                    onSaved={saved}
                />
            )}
            {bulkDecision && (
                <ModerationBulkDialog
                    decision={bulkDecision}
                    items={items.filter((item) => selected.includes(item.id))}
                    onClose={() => setBulkDecision(undefined)}
                    onComplete={bulkSaved}
                />
            )}
        </Flex>
    );
}
