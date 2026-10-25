import type { ShareableMediaKind } from "@persons/person-domain/media/shareLink.types";

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readSharedMedia(search: string) {
    const query = new URLSearchParams(search);
    const photo = query.getAll("photo");
    const video = query.getAll("video");
    if (photo.length + video.length !== 1) {
        return undefined;
    }
    const id = photo[0] ?? video[0];
    if (!UUID_PATTERN.test(id)) {
        return undefined;
    }
    return {
        id,
        kind: (photo.length ? "PHOTO" : "MOMENT") as ShareableMediaKind,
    };
}

export function mediaShareLink(
    origin: string,
    tag: string,
    kind: ShareableMediaKind,
    id: string,
): string {
    const url = new URL(`/${encodeURIComponent(tag)}`, origin);
    url.searchParams.set(kind === "PHOTO" ? "photo" : "video", id);
    return url.href;
}

export function updateMediaQuery(
    url: URL,
    kind?: ShareableMediaKind,
    id?: string,
): URL {
    const next = new URL(url);
    next.searchParams.delete("photo");
    next.searchParams.delete("video");
    if (kind && id) {
        next.searchParams.set(kind === "PHOTO" ? "photo" : "video", id);
    }
    return next;
}
