'use client';
import type { ModerationItem } from '@persons/person-client';
import { useLocale, useTranslate } from '@persons/i18n';
import { mediaHref } from '@persons/person-domain/api/browser';
import { PublicationTable } from '@/shared/ui/PublicationTable/PublicationTable';
import { moderationDestination, moderationMedia, readModerationPayload } from '@/modules/moderation/model/content';

export function ModerationTable({
    items,
    publicUrl,
    selected,
    onSelection,
    onOpen,
}: {
    readonly items: ModerationItem[];
    readonly publicUrl: string;
    readonly selected: string[];
    readonly onSelection: (ids: string[]) => void;
    readonly onOpen: (item: ModerationItem) => void;
}) {
    const t = useTranslate('moderation');
    const person = useTranslate('person');
    const cms = useTranslate('cms');
    const locale = useLocale();
    return (
        <PublicationTable
            selected={selected}
            onSelection={onSelection}
            onOpen={(id) => {
                const item = items.find((row) => row.id === id);
                if (item) {
                    onOpen(item);
                }
            }}
            rows={items.map((item) => {
                const media = moderationMedia(item);
                const payload = readModerationPayload(item.payload);
                const proposed = payload?.text ?? payload?.description ?? payload?.caption;
                return {
                    id: item.id,
                    title: person(item.kind),
                    text: typeof proposed === 'string' ? proposed : item.summary,
                    preview:
                        media.id && (media.kind === 'PHOTO' || media.kind === 'AVATAR')
                            ? mediaHref(media.id)
                            : media.id && item.previewAvailable
                              ? `/api/person/v1/media/${media.id}/preview`
                              : undefined,
                    video: media.kind === 'MOMENT',
                    page: {
                        name: item.personName || `@${item.personTag}`,
                        tag: item.personTag,
                        avatar: item.personAvatarMediaId ? mediaHref(item.personAvatarMediaId) : undefined,
                        href: moderationDestination(item, publicUrl, locale),
                    },
                    author: {
                        name: item.authorName,
                        tag: item.authorTag,
                        avatar: item.authorAvatarUrl,
                        href: item.authorTag
                            ? new URL(`/${locale}/person/${item.authorTag}`, publicUrl).href
                            : undefined,
                    },
                    status: item.automatic ? cms('automatic') : t(item.status),
                    statusTheme:
                        item.status === 'APPROVED' ? 'success' : item.status === 'REJECTED' ? 'danger' : 'warning',
                    createdAt: item.createdAt,
                    sizeBytes: item.sizeBytes,
                    selectable: item.status === 'PENDING',
                };
            })}
        />
    );
}
