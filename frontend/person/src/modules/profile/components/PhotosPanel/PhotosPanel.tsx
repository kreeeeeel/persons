'use client';
import { MediaGrid } from '@persons/person-domain/MediaGrid';
import type { MediaGridProps } from '@persons/person-domain/MediaGrid/MediaGrid.types';
export function PhotosPanel(props: Omit<MediaGridProps, 'kind'>) {
    return <MediaGrid {...props} kind="PHOTO" />;
}
