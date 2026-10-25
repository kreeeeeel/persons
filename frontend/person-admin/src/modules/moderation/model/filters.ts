import type {
    ListModerationRequest,
    ModerationContentType,
    ModerationFilterStatus,
    ModerationOrder,
} from '@persons/person-client';

export interface ModerationFiltersValue {
    readonly status: ModerationFilterStatus;
    readonly type: ModerationContentType | '';
    readonly q: string;
    readonly authorId: string;
    readonly authorName: string;
    readonly personId: string;
    readonly personName: string;
    readonly from: string;
    readonly to: string;
    readonly order: ModerationOrder;
    readonly page: number;
    readonly size: number;
}

export const defaultModerationFilters: ModerationFiltersValue = {
    status: 'PENDING',
    type: '',
    q: '',
    authorId: '',
    authorName: '',
    personId: '',
    personName: '',
    from: '',
    to: '',
    order: 'OLDEST',
    page: 0,
    size: 20,
};

export const moderationStatuses: ModerationFilterStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'];
export const moderationTypes: ModerationContentType[] = [
    'PERSON',
    'PHOTO',
    'MOMENT',
    'AVATAR',
    'COMMENT',
    'CREDIT',
    'OWNERSHIP',
];
export const moderationOrders: ModerationOrder[] = ['OLDEST', 'NEWEST', 'AUTHOR', 'TYPE'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readDate(value: string | null): string {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return '';
    }
    const time = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? value : '';
}

export function readModerationFilters(params: Pick<URLSearchParams, 'get'>): ModerationFiltersValue {
    const page = Number(params.get('page') ?? 0);
    const authorId = params.get('authorId') ?? '';
    const personId = params.get('personId') ?? '';
    return {
        status: moderationStatuses.find((value) => value === params.get('status')) ?? 'PENDING',
        type: moderationTypes.find((value) => value === params.get('type')) ?? '',
        q: (params.get('q') ?? '').slice(0, 200),
        authorId: UUID_PATTERN.test(authorId) ? authorId : '',
        authorName: (params.get('authorName') ?? '').slice(0, 250),
        personId: UUID_PATTERN.test(personId) ? personId : '',
        personName: (params.get('personName') ?? '').slice(0, 250),
        from: readDate(params.get('from')),
        to: readDate(params.get('to')),
        order: moderationOrders.find((value) => value === params.get('order')) ?? 'OLDEST',
        page: Number.isInteger(page) && page >= 0 && page <= 10000 ? page : 0,
        size: params.get('size') === '50' ? 50 : 20,
    };
}

export function moderationFilterParams(filters: ModerationFiltersValue): URLSearchParams {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== defaultModerationFilters[key as keyof ModerationFiltersValue]) {
            params.set(key, String(value));
        }
    });
    return params;
}

export function moderationRequest(filters: ModerationFiltersValue): ListModerationRequest {
    const start = filters.from ? new Date(`${filters.from}T00:00:00+03:00`) : undefined;
    const end = filters.to ? new Date(Date.parse(`${filters.to}T00:00:00+03:00`) + 86400000) : undefined;
    return {
        page: filters.page,
        size: filters.size,
        status: filters.status,
        type: filters.type || undefined,
        q: filters.q.trim() || undefined,
        authorId: filters.authorId || undefined,
        personId: filters.personId || undefined,
        createdFrom: start,
        createdTo: end,
        order: filters.order,
    };
}
