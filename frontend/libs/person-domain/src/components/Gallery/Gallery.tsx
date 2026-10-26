"use client";

import { useCallback, useState } from "react";
import {
    Box,
    Button,
    Flex,
    Icon,
    Pagination,
    Skeleton,
} from "@gravity-ui/uikit";
import { FileArrowUp } from "@gravity-ui/icons";
import { useTranslate } from "@persons/i18n";
import { personClient } from "@persons/person-domain/api/browser";
import { usePersonData } from "@persons/person-domain/hooks/usePersonData";
import { useUploadEvents } from "@persons/person-domain/uploads/useUploadEvents";
import { FeedContent } from "@persons/person-domain/FeedContent";
import { MediaCard } from "@persons/person-domain/MediaCard";
import { MediaViewer } from "@persons/person-domain/MediaViewer";
import { MediaUploader } from "@persons/person-domain/MediaUploader";
import type { GalleryProps } from "@persons/person-domain/Gallery/Gallery.types";
import styles from "@persons/person-domain/Gallery/Gallery.module.css";

const PAGE_SIZE = 12;

export function Gallery({
    personId,
    personTag,
    signedIn,
    publicUrl,
    selectedMedia,
    onOpenMedia,
    onCloseMedia,
}: GalleryProps) {
    const t = useTranslate("person");
    const [page, setPage] = useState(1);
    const [uploading, setUploading] = useState(false);
    const [localSelection, setLocalSelection] =
        useState<GalleryProps["selectedMedia"]>();
    const selected = onOpenMedia ? selectedMedia : localSelection;
    const open = (kind: "PHOTO" | "MOMENT", id: string) =>
        onOpenMedia ? onOpenMedia(kind, id) : setLocalSelection({ kind, id });
    const load = useCallback(
        (signal: AbortSignal) =>
            personClient.gallery.listGallery(
                { id: personId, page: page - 1, size: PAGE_SIZE },
                { signal },
            ),
        [personId, page],
    );
    const resource = usePersonData(`gallery:${personId}:${page}`, load);
    useUploadEvents(personId, resource.refresh);
    return (
        <Flex direction="column" gap="4">
            {signedIn && (
                <Flex justifyContent="flex-start">
                    <Button
                        size="l"
                        view="action"
                        onClick={() => setUploading(true)}
                    >
                        <Icon data={FileArrowUp} size={20} />
                        {t("upload")}
                    </Button>
                </Flex>
            )}
            <FeedContent
                loading={resource.loading}
                error={resource.error}
                retainContentOnError={resource.data !== undefined}
                empty={!resource.data?.items.length}
                emptyTitle={t("emptyGallery")}
                emptyDescription=""
                illustration="photos"
                onRetry={resource.refresh}
                skeleton={
                    <Box
                        className={styles.grid}
                        role="status"
                        aria-busy
                        aria-label={t("loading")}
                    >
                        {[0, 1, 2, 3, 4, 5].map((key) => (
                            <Flex key={key} direction="column" gap="3">
                                <Skeleton className={styles.previewSkeleton} />
                                <Skeleton className={styles.captionSkeleton} />
                            </Flex>
                        ))}
                    </Box>
                }
            >
                <Box className={styles.grid}>
                    {resource.data?.items.map((item) => (
                        <MediaCard
                            key={item.id}
                            item={item}
                            kind={item.kind === "MOMENT" ? "MOMENT" : "PHOTO"}
                            onOpen={() =>
                                open(
                                    item.kind === "MOMENT" ? "MOMENT" : "PHOTO",
                                    item.mediaId,
                                )
                            }
                        />
                    ))}
                </Box>
            </FeedContent>
            {((resource.data?.total ?? 0) > PAGE_SIZE || page > 1) && (
                <Box
                    as="nav"
                    aria-label={t("galleryPages")}
                    className={styles.pagination}
                >
                    <Pagination
                        page={page}
                        pageSize={PAGE_SIZE}
                        total={resource.data?.total}
                        size="l"
                        compact
                        onUpdate={setPage}
                    />
                </Box>
            )}
            {selected && (
                <MediaViewer
                    mediaId={selected.id}
                    personId={personId}
                    personTag={personTag}
                    kind={selected.kind}
                    signedIn={signedIn}
                    publicUrl={publicUrl}
                    mixedGallery
                    onClose={() =>
                        onCloseMedia
                            ? onCloseMedia()
                            : setLocalSelection(undefined)
                    }
                    onNavigate={(id, kind) => open(kind, id)}
                    onChanged={resource.refresh}
                />
            )}
            {uploading && (
                <MediaUploader
                    personId={personId}
                    onClose={() => setUploading(false)}
                    onSaved={() => {
                        setUploading(false);
                        resource.refresh();
                    }}
                />
            )}
        </Flex>
    );
}
