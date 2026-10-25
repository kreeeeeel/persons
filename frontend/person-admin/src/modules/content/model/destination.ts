import type { AdminContentItem } from '@persons/person-client';

export function contentDestination(item: AdminContentItem, publicUrl: string, locale: string): string {
    const url = new URL(`/${locale}/person/${encodeURIComponent(item.personTag)}`, publicUrl);
    if (item.kind === 'PHOTO' || item.kind === 'MOMENT') {
        url.searchParams.set(item.kind === 'PHOTO' ? 'photo' : 'video', item.id);
    }
    return url.toString();
}
