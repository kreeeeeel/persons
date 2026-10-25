import type { IdentityCellProps } from '@/shared/ui/IdentityCell/IdentityCell';
export interface PublicationRow {
    readonly id: string;
    readonly title: string;
    readonly text: string;
    readonly preview?: string;
    readonly video?: boolean;
    readonly page: IdentityCellProps;
    readonly author: IdentityCellProps;
    readonly status: string;
    readonly statusTheme: 'success' | 'warning' | 'normal' | 'danger';
    readonly createdAt: Date;
    readonly sizeBytes?: number;
    readonly selectable?: boolean;
}
