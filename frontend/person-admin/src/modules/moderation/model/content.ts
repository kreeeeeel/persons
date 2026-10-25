import type { ModerationItem } from '@persons/person-client';

export function moderationCategory(item: ModerationItem): string {
    if (['LINK_ACCOUNT', 'CLAIM_OWNERSHIP'].includes(item.kind)) {
        return 'OWNERSHIP';
    }
    if (item.kind.includes('COMMENT') || item.kind === 'DELETE_RATING') {
        return 'COMMENT';
    }
    if (item.kind.includes('CREDIT')) {
        return 'CREDIT';
    }
    if (item.kind.includes('MEDIA')) {
        return moderationMedia(item).kind ?? 'PHOTO';
    }
    return 'PERSON';
}

export function readModerationPayload(payload: string): Record<string, unknown> | undefined {
    try {
        const value: unknown = JSON.parse(payload);
        return value && typeof value === 'object' && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : undefined;
    } catch {
        return undefined;
    }
}

export function moderationMedia(item: ModerationItem) {
    const payload = readModerationPayload(item.payload);
    const id = item.mediaId ?? (typeof payload?.mediaId === 'string' ? payload.mediaId : undefined);
    const kind = item.mediaKind ?? (typeof payload?.kind === 'string' ? payload.kind : undefined);
    return { id, kind, caption: typeof payload?.caption === 'string' ? payload.caption : item.summary };
}

export function moderationDestination(item: ModerationItem, publicUrl: string, locale: string): string {
    const url = new URL(`/${locale}/person/${encodeURIComponent(item.personTag)}`, publicUrl);
    const media = moderationMedia(item);
    if (media.id && (media.kind === 'PHOTO' || media.kind === 'MOMENT')) {
        url.searchParams.set(media.kind === 'PHOTO' ? 'photo' : 'video', media.id);
    }
    return url.href;
}
