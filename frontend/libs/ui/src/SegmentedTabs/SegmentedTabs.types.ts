import type { ReactNode } from 'react';

export interface SegmentedTabItem {
    readonly value: string;
    readonly label: string;
    readonly icon?: ReactNode;
    readonly disabled?: boolean;
}

export interface SegmentedTabsProps {
    readonly compact?: boolean;
    readonly items: readonly SegmentedTabItem[];
    readonly value: string;
    readonly onUpdate: (value: string) => void;
    readonly label: string;
}
