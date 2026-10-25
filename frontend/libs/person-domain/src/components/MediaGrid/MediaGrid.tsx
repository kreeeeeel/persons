"use client";

import { useCallback, useState } from "react";
import { Box, Button, Flex, Icon, Skeleton } from "@gravity-ui/uikit";
import { Picture, Video } from "@gravity-ui/icons";
import { useTranslate } from "@persons/i18n";
import { personClient } from "@persons/person-domain/api/browser";
import { useInfinitePersonData } from "@persons/person-domain/hooks/useInfinitePersonData";
import { useUploadEvents } from "@persons/person-domain/uploads/useUploadEvents";
import { FeedContent } from "@persons/person-domain/FeedContent";
import { InfiniteFeedLoader } from "@persons/person-domain/InfiniteFeedLoader";
import { MediaUploader } from "@persons/person-domain/MediaUploader";
import { MediaCard } from "@persons/person-domain/MediaCard";
import { MediaViewer } from "@persons/person-domain/MediaViewer";
import type { MediaGridProps } from "@persons/person-domain/MediaGrid/MediaGrid.types";
import styles from "@persons/person-domain/MediaGrid/MediaGrid.module.css";

const PAGE_SIZE = 12;

export function MediaGrid({
    personId,
    kind,
    signedIn,
    publicUrl,
    personTag,
    selectedMediaId,
    onOpenMedia,
    onCloseMedia,
}: MediaGridProps) {
    const t = useTranslate("person");
    const [uploading, setUploading] = useState(false);
    const [localSelection, setLocalSelection] = useState<string>();
    const selected = onOpenMedia ? selectedMediaId : localSelection;
    const select = onOpenMedia ?? setLocalSelection;
    const load = useCallback(
        (page: number, signal: AbortSignal) =>
            kind === "PHOTO"
                ? personClient.persons.listPhotos(
                      { id: personId, page, size: PAGE_SIZE },
                      { signal },
                  )
                : personClient.persons.listMoments(
                      { id: personId, page, size: PAGE_SIZE },
                      { signal },
                  ),
        [personId, kind],
    );
    const resource = useInfinitePersonData(`media:${personId}:${kind}`, load);
    useUploadEvents(personId, () => {
        resource.refresh();
    });
    const addButton = signedIn ? (
        <Button size="l" view="action" onClick={() => setUploading(true)}>
            <Icon data={kind === "PHOTO" ? Picture : Video} size={20} />
            {t(kind === "PHOTO" ? "addPhoto" : "addMoment")}
        </Button>
    ) : undefined;
    return (
        <Flex direction="column" gap="4">
            {signedIn && !resource.loading && !!resource.data?.items.length && (
                <Flex justifyContent="flex-end">{addButton}</Flex>
            )}
            <FeedContent
                illustration={kind === "PHOTO" ? "photos" : "media"}
                loading={resource.loading}
                skeleton={
                    <Box
                        className={styles.grid}
                        role="status"
                        aria-busy="true"
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
                error={resource.error}
                retainContentOnError={resource.data !== undefined}
                empty={!resource.data?.items.length}
                emptyTitle={t(
                    kind === "PHOTO" ? "emptyPhotos" : "emptyMoments",
                )}
                emptyDescription={t(
                    kind === "PHOTO"
                        ? "emptyPhotosDescription"
                        : "emptyMomentsDescription",
                )}
                onRetry={resource.refresh}
                emptyAction={addButton}
            >
                <Box className={styles.grid}>
                    {resource.data?.items.map((item) => (
                        <MediaCard
                            key={item.id}
                            item={item}
                            kind={kind}
                            onOpen={() => select(item.mediaId)}
                        />
                    ))}
                </Box>
            </FeedContent>
            <InfiniteFeedLoader {...resource} />
            {uploading && (
                <MediaUploader
                    personId={personId}
                    kind={kind}
                    onClose={() => setUploading(false)}
                    onSaved={() => {
                        setUploading(false);
                        resource.refresh();
                    }}
                />
            )}
            {selected && (
                <MediaViewer
                    mediaId={selected}
                    personId={personId}
                    personTag={personTag}
                    kind={kind}
                    signedIn={signedIn}
                    publicUrl={publicUrl}
                    onClose={
                        onCloseMedia ?? (() => setLocalSelection(undefined))
                    }
                    onNavigate={select}
                    onChanged={resource.refresh}
                />
            )}
        </Flex>
    );
}
