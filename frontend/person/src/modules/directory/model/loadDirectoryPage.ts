import type { DirectoryOrder } from '@persons/person-client';
import { personClient } from '@persons/person-domain/api/browser';
import type { DirectorySort } from '@/modules/directory/model/DirectorySort';

const orders: Record<DirectorySort, DirectoryOrder> = {
    views: 'VIEWS',
    popular: 'RATING',
    newest: 'NEWEST',
    name: 'NAME',
};

export function loadDirectoryPage(page: number, size: number, sort: DirectorySort, signal: AbortSignal) {
    return personClient.persons.listDirectory({ page, size, order: orders[sort] }, { signal });
}
