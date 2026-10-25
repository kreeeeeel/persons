export type ShareableContentKind = "DOTA_MATCH" | "CS_MATCH";

const QUERIES = {
    DOTA_MATCH: "dotaMatch",
    CS_MATCH: "csMatch",
} as const;
const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readSharedContent(search: string) {
    const query = new URLSearchParams(search);
    const entries = Object.entries(QUERIES).flatMap(([kind, key]) =>
        query
            .getAll(key)
            .map((id) => ({ kind: kind as ShareableContentKind, id })),
    );
    if (entries.length !== 1 || query.has("photo") || query.has("video")) {
        return undefined;
    }
    const value = entries[0];
    return (
        value.kind === "DOTA_MATCH"
            ? /^[1-9][0-9]{0,18}$/.test(value.id)
            : UUID_PATTERN.test(value.id)
    )
        ? value
        : undefined;
}

export function updateContentQuery(
    url: URL,
    kind?: ShareableContentKind,
    id?: string,
) {
    const next = new URL(url);
    Object.values(QUERIES).forEach((key) => next.searchParams.delete(key));
    if (kind && id) {
        next.searchParams.delete("photo");
        next.searchParams.delete("video");
        next.searchParams.set(QUERIES[kind], id);
    }
    return next;
}

export function contentShareLink(
    origin: string,
    tag: string,
    kind: ShareableContentKind,
    id: string,
) {
    return updateContentQuery(
        new URL(`/${encodeURIComponent(tag)}`, origin),
        kind,
        id,
    ).href;
}
