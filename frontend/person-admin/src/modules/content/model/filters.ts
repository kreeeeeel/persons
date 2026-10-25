import type {
    ListAdminContentRequest,
    AdminContentKind,
    AdminContentStatus,
    AdminContentOrder,
} from '@persons/person-client';

export interface ContentFiltersValue {
    readonly status: AdminContentStatus | '';
    readonly type: AdminContentKind | '';
    readonly q: string;
    readonly authorId: string;
    readonly authorName: string;
    readonly personId: string;
    readonly personName: string;
    readonly from: string;
    readonly to: string;
    readonly order: AdminContentOrder;
    readonly page: number;
    readonly size: number;
}

export const defaultContentFilters: ContentFiltersValue = {
    status: '',
    type: '',
    q: '',
    authorId: '',
    authorName: '',
    personId: '',
    personName: '',
    from: '',
    to: '',
    order: 'NEWEST',
    page: 0,
    size: 20,
};

export const contentStatuses: AdminContentStatus[] = ['PUBLISHED', 'PENDING', 'HIDDEN', 'DRAFT'];
export const contentTypes: AdminContentKind[] = ['PERSON', 'PHOTO', 'MOMENT', 'AVATAR', 'COMMENT', 'CREDIT', 'RATING'];
export const contentOrders: AdminContentOrder[] = ['NEWEST', 'OLDEST', 'AUTHOR', 'PAGE', 'TYPE'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readDate(value: string | null): string {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return '';
    }
    const time = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? value : '';
}

export function readContentFilters(params: Pick<URLSearchParams, 'get'>): ContentFiltersValue {
    const page = Number(params.get('page') ?? 0);
    const authorId = params.get('authorId') ?? '';
    const personId = params.get('personId') ?? '';
    return {
        status: contentStatuses.find((value) => value === params.get('status')) ?? '',
        type: contentTypes.find((value) => value === params.get('type')) ?? '',
        q: (params.get('q') ?? '').slice(0, 200),
        authorId: UUID_PATTERN.test(authorId) ? authorId : '',
        authorName: (params.get('authorName') ?? '').slice(0, 250),
        personId: UUID_PATTERN.test(personId) ? personId : '',
        personName: (params.get('personName') ?? '').slice(0, 250),
        from: readDate(params.get('from')),
        to: readDate(params.get('to')),
        order: contentOrders.find((value) => value === params.get('order')) ?? 'NEWEST',
        page: Number.isInteger(page) && page >= 0 && page <= 10000 ? page : 0,
        size: params.get('size') === '50' ? 50 : 20,
    };
}

export function contentFilterParams(filters: ContentFiltersValue): URLSearchParams {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== defaultContentFilters[key as keyof ContentFiltersValue]) {
            params.set(key, String(value));
        }
    });
    return params;
}

export function contentRequest(filters: ContentFiltersValue): ListAdminContentRequest {
    const start = filters.from ? new Date(`${filters.from}T00:00:00+03:00`) : undefined;
    const end = filters.to ? new Date(Date.parse(`${filters.to}T00:00:00+03:00`) + 86400000) : undefined;
    return {
        page: filters.page,
        size: filters.size,
        status: filters.status || undefined,
        kind: filters.type || undefined,
        q: filters.q.trim() || undefined,
        authorId: filters.authorId || undefined,
        personId: filters.personId || undefined,
        createdFrom: start,
        createdTo: end,
        order: filters.order,
    };
}
