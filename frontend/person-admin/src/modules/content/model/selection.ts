import type { AdminContentItem } from '@persons/person-client';

export type ContentBulkAction = 'APPROVE' | 'REJECT' | 'REMOVE';

export function contentKey(item: Pick<AdminContentItem, 'kind' | 'id'>) {
    return `${item.kind}:${item.id}`;
}

export function bulkEligible(item: AdminContentItem, action: ContentBulkAction) {
    return item.status !== 'HIDDEN' && (action === 'REMOVE' || Boolean(item.pendingRequestId));
}
