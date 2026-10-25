'use client';
import type { AdminContentItem } from '@persons/person-client';
import { useLocale, useTranslate } from '@persons/i18n';
import { mediaHref } from '@persons/person-domain/api/browser';
import { PublicationTable } from '@/shared/ui/PublicationTable/PublicationTable';
import { contentKey } from '@/modules/content/model/selection';
import { contentDestination } from '@/modules/content/model/destination';

export function ContentTable({
    items,
    publicUrl,
    onOpen,
    selected,
    onSelection,
}: {
    readonly items: AdminContentItem[];
    readonly publicUrl: string;
    readonly onOpen: (item: AdminContentItem) => void;
    readonly selected: string[];
    readonly onSelection: (ids: string[]) => void;
}) {
    const t = useTranslate('content');
    const cms = useTranslate('cms');
    const locale = useLocale();
    return (
        <PublicationTable
            selected={selected}
            onSelection={onSelection}
            onOpen={(id) => {
                const item = items.find((row) => contentKey(row) === id);
                if (item) {
                    onOpen(item);
                }
            }}
            rows={items.map((item) => ({
                id: contentKey(item),
                selectable: item.status !== 'HIDDEN',
                title: t(item.kind),
                text: item.text,
                preview:
                    item.mediaAvailable && item.mediaId && (item.kind !== 'MOMENT' || item.previewAvailable)
                        ? item.kind === 'MOMENT'
                            ? `/api/person/v1/media/${item.mediaId}/preview`
                            : mediaHref(item.mediaId)
                        : undefined,
                video: item.kind === 'MOMENT',
                page: {
                    name: item.personName,
                    tag: item.personTag,
                    avatar: item.personAvatarMediaId ? mediaHref(item.personAvatarMediaId) : undefined,
                    href: contentDestination(item, publicUrl, locale),
                },
                author: {
                    name: item.authorName || '—',
                    tag: item.authorTag,
                    avatar: item.authorAvatarUrl,
                    href: item.authorTag ? new URL(`/${locale}/person/${item.authorTag}`, publicUrl).href : undefined,
                },
                status:
                    item.status === 'PENDING'
                        ? cms('reviewStatus')
                        : item.status === 'DRAFT'
                          ? cms('uploadStatus')
                          : t(item.status),
                statusTheme: item.status === 'PUBLISHED' ? 'success' : item.status === 'PENDING' ? 'warning' : 'normal',
                createdAt: item.createdAt,
                sizeBytes: item.sizeBytes,
            }))}
        />
    );
}
