import type { DropdownMenuItem, TableColumnConfig } from '@gravity-ui/uikit';

export type ActionTableProps<T extends { id: string }> = {
    readonly data: T[];
    readonly columns: TableColumnConfig<T>[];
    readonly label: (item: T) => string;
    readonly actionLabel?: string;
    readonly disabled?: boolean;
} & (
    | { readonly actions: (item: T) => DropdownMenuItem<unknown>[]; readonly onOpen?: never }
    | { readonly onOpen: (item: T) => void; readonly actions?: never }
);
