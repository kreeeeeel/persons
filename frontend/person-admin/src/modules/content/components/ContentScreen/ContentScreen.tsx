'use client';
import { InfiniteFeedLoader } from '@persons/person-domain/InfiniteFeedLoader';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Flex, Text } from '@gravity-ui/uikit';
import type { AdminContentItem } from '@persons/person-client';
import { useTranslate } from '@persons/i18n';
import { personClient } from '@persons/person-domain/api/browser';
import { useInfinitePersonData } from '@persons/person-domain/hooks/useInfinitePersonData';
import { ListPageHeader } from '@/shared/ui/ListPageHeader/ListPageHeader';
import { SelectionToolbar } from '@/shared/ui/SelectionToolbar/SelectionToolbar';
import { ContentBulkDialog } from '@/modules/content/components/ContentBulkDialog/ContentBulkDialog';
import type { ContentBulkResult } from '@/modules/content/components/ContentBulkDialog/ContentBulkDialog.types';
import { bulkEligible, contentKey } from '@/modules/content/model/selection';
import type { ContentBulkAction } from '@/modules/content/model/selection';
import { ListTable } from '@/shared/ui/ListTable/ListTable';
import { contentFilterParams, contentRequest, readContentFilters } from '@/modules/content/model/filters';
import type { ContentFiltersValue } from '@/modules/content/model/filters';
import { ContentFilters } from '@/modules/content/components/ContentFilters/ContentFilters';
import { ContentTable } from '@/modules/content/components/ContentTable/ContentTable';
import { ContentDialog } from '@/modules/content/components/ContentDialog/ContentDialog';
import { MetricSummary } from '@/shared/ui/MetricSummary/MetricSummary';
import layout from '@/modules/content/components/ContentScreen/ContentScreen.module.css';

const METRICS = [
    ['PUBLISHED', 'published'],
    ['PENDING', 'pending'],
    ['HIDDEN', 'hidden'],
    ['DRAFT', 'draft'],
] as const;

export function ContentScreen({ publicUrl }: { readonly publicUrl: string }) {
    const t = useTranslate('content');
    const cms = useTranslate('cms');
    const person = useTranslate('person');
    const router = useRouter();
    const pathname = usePathname();
    const search = useSearchParams()?.toString() ?? '';
    const filters = useMemo(() => readContentFilters(new URLSearchParams(search)), [search]);
    const request = useMemo(() => contentRequest(filters), [filters]);
    const load = useCallback(
        (page: number, signal: AbortSignal) =>
            personClient.contentAdmin.listAdminContent({ ...request, page }, { signal }),
        [request],
    );
    const resource = useInfinitePersonData(`content:${JSON.stringify(request)}`, load);
    const key = JSON.stringify(request);
    const items = resource.data?.items ?? [];
    const [selection, setSelection] = useState<{ key: string; ids: string[] }>({ key, ids: [] });
    const selected =
        selection.key === key
            ? selection.ids.filter((id) => items.some((item) => contentKey(item) === id && item.status !== 'HIDDEN'))
            : [];
    const chosen = items.filter((item) => selected.includes(contentKey(item)));
    const [bulkAction, setBulkAction] = useState<ContentBulkAction>();
    const [bulkResult, setBulkResult] = useState<{ result: ContentBulkResult; errors: string[] }>();
    function bulkSaved(result: ContentBulkResult) {
        setBulkAction(undefined);
        setSelection({ key, ids: selected.filter((id) => !result.success.includes(id)) });
        setBulkResult({
            result,
            errors: result.failures.map(
                ({ key: failed, code }) =>
                    `${items.find((item) => contentKey(item) === failed)?.personName || ''}: ${person(code)}`,
            ),
        });
        resource.refresh();
    }
    const [viewed, setViewed] = useState<AdminContentItem>();
    const [saved, setSaved] = useState(false);
    const update = useCallback(
        (value: ContentFiltersValue) => {
            const params = contentFilterParams(value).toString();
            router.replace(`${pathname}${params ? `?${params}` : ''}`, { scroll: false });
        },
        [pathname, router],
    );
    return (
        <Flex direction="column" gap="5" className={layout.screen}>
            <ListPageHeader
                title={t('title')}
                description={t('description')}
                action={
                    <Button size="l" loading={resource.refreshing} onClick={resource.refresh}>
                        {t('refresh')}
                    </Button>
                }
            />
            <MetricSummary
                items={METRICS.map(([status, key]) => ({
                    key,
                    label: t(status),
                    count: resource.data?.statistics[key],
                    selected: filters.status === status,
                    onClick: () => update({ ...filters, status: filters.status === status ? '' : status, page: 0 }),
                }))}
            />
            <ContentFilters value={filters} onApply={update} />
            {saved && (
                <Alert theme="success" align="center" message={t('decisionSaved')} onClose={() => setSaved(false)} />
            )}
            {bulkResult && (
                <Alert
                    theme={bulkResult.result.failures.length ? 'danger' : 'success'}
                    align="center"
                    onClose={() => setBulkResult(undefined)}
                    message={
                        <Flex direction="column" gap="2">
                            <Text>
                                {bulkResult.result.failures.length
                                    ? t('bulkPartial', {
                                          success: bulkResult.result.success.length,
                                          failed: bulkResult.result.failures.length,
                                      })
                                    : t('bulkSuccess', { count: bulkResult.result.success.length })}
                            </Text>
                            {bulkResult.errors.map((error, index) => (
                                <Text key={index}>{error}</Text>
                            ))}
                        </Flex>
                    }
                />
            )}
            <SelectionToolbar
                count={selected.length}
                total={resource.data?.total ?? 0}
                onSelectAll={() =>
                    setSelection({ key, ids: items.filter((item) => item.status !== 'HIDDEN').map(contentKey) })
                }
                onClear={() => setSelection({ key, ids: [] })}
            >
                <Button
                    view="flat"
                    disabled={!chosen.some((item) => bulkEligible(item, 'APPROVE'))}
                    onClick={() => setBulkAction('APPROVE')}
                >
                    {cms('approve')}
                </Button>
                <Button
                    view="flat-danger"
                    disabled={!chosen.some((item) => bulkEligible(item, 'REJECT'))}
                    onClick={() => setBulkAction('REJECT')}
                >
                    {cms('reject')}
                </Button>
                <Button
                    view="flat-danger"
                    disabled={!chosen.some((item) => bulkEligible(item, 'REMOVE'))}
                    onClick={() => setBulkAction('REMOVE')}
                >
                    {t('confirmHide')}
                </Button>
            </SelectionToolbar>
            <ListTable
                title={t('title')}
                loading={resource.loading}
                error={resource.error}
                retry={resource.refresh}
                empty={!resource.data?.items.length}
                emptyTitle={t('emptyTitle')}
                emptyDescription={t('emptyDescription')}
                illustration="publications"
            >
                <ContentTable
                    items={items}
                    publicUrl={publicUrl}
                    onOpen={setViewed}
                    selected={selected}
                    onSelection={(ids) => setSelection({ key, ids })}
                />
            </ListTable>
            <InfiniteFeedLoader {...resource} />
            {bulkAction && (
                <ContentBulkDialog
                    items={chosen}
                    action={bulkAction}
                    onClose={() => setBulkAction(undefined)}
                    onComplete={bulkSaved}
                />
            )}
            {viewed && (
                <ContentDialog
                    key={`${viewed.kind}:${viewed.id}`}
                    item={viewed}
                    publicUrl={publicUrl}
                    onClose={() => setViewed(undefined)}
                    onSaved={() => {
                        setViewed(undefined);
                        setSaved(true);
                        resource.refresh();
                    }}
                />
            )}
        </Flex>
    );
}
