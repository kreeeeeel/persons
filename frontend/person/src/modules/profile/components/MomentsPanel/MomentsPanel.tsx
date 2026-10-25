'use client';
import { MediaGrid } from '@persons/person-domain/MediaGrid';
import type { MediaGridProps } from '@persons/person-domain/MediaGrid/MediaGrid.types';
export function MomentsPanel(props: Omit<MediaGridProps, 'kind'>) {
    return <MediaGrid {...props} kind="MOMENT" />;
}
