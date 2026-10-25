import type { ReactNode } from 'react';

export interface SiteHeaderProps {
    readonly children: ReactNode;
    readonly showSearch?: boolean;
    readonly showFeed?: boolean;
}
