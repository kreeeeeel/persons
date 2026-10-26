"use client";

import { useCallback } from "react";
import { Box, Button, Dialog, Flex, Icon, Skeleton } from "@gravity-ui/uikit";
import { ChevronLeft, ChevronRight } from "@gravity-ui/icons";
import { ResponseError } from "@persons/person-client";
import { LoadErrorContext } from "@persons/ui/loading/LoadErrorContext";
import { useTranslate } from "@persons/i18n";
import { personClient } from "@persons/person-domain/api/browser";
import { usePersonData } from "@persons/person-domain/hooks/usePersonData";
import { FeedContent } from "@persons/person-domain/FeedContent";
import { MediaViewerContent } from "@persons/person-domain/MediaViewerContent";
import type { MediaViewerProps } from "@persons/person-domain/MediaViewer/MediaViewer.types";
import styles from "@persons/person-domain/MediaViewer/MediaViewer.module.css";

export function MediaViewer({
    mediaId,
    personId,
    personTag,
    kind,
    signedIn,
    publicUrl,
    mixedGallery = false,
    onClose,
    onNavigate,
    onChanged,
}: MediaViewerProps) {
    const t = useTranslate("person");
    const load = useCallback(
        async (signal: AbortSignal) => {
            const result = await personClient.gallery.getMediaDetail(
                { id: mediaId, ...(mixedGallery ? { mixed: true } : {}) },
                { signal },
            );
            if (result.personId !== personId || result.kind !== kind) {
                throw new ResponseError(
                    Response.json(
                        { code: "CONTENT_NOT_FOUND" },
                        { status: 404 },
                    ),
                );
            }
            return result;
        },
        [mediaId, personId, kind, mixedGallery],
    );
    const resource = usePersonData(
        `media:${personId}:${kind}:${mediaId}:${mixedGallery}`,
        load,
    );
    const detail = resource.data;
    const previousId = detail?.previousMediaId;
    const nextId = detail?.nextMediaId;

    return (
        <Dialog
            open
            className={styles.dialog}
            modalClassName={
                kind === "PHOTO"
                    ? `${styles.modal} ${styles.photoModal}`
                    : styles.modal
            }
            fullWidth={kind !== "PHOTO"}
            contentOverflow="visible"
            disableHeightTransition
            hasCloseButton
            onClose={onClose}
            aria-label={t("mediaViewer")}
        >
            {onNavigate && previousId && (
                <Button
                    size="xl"
                    view="normal-contrast"
                    className={`${styles.navigation} ${styles.previous}`}
                    aria-label={t("previousMedia")}
                    onClick={() =>
                        onNavigate(
                            previousId,
                            detail?.previousMediaKind === "MOMENT"
                                ? "MOMENT"
                                : "PHOTO",
                        )
                    }
                >
                    <Icon data={ChevronLeft} size={36} />
                </Button>
            )}
            {onNavigate && nextId && (
                <Button
                    size="xl"
                    view="normal-contrast"
                    className={`${styles.navigation} ${styles.next}`}
                    aria-label={t("nextMedia")}
                    onClick={() =>
                        onNavigate(
                            nextId,
                            detail?.nextMediaKind === "MOMENT"
                                ? "MOMENT"
                                : "PHOTO",
                        )
                    }
                >
                    <Icon data={ChevronRight} size={36} />
                </Button>
            )}
            <Dialog.Body className={styles.body} aria-busy={resource.loading}>
                <LoadErrorContext value="dialog">
                    <FeedContent
                        loading={resource.loading}
                        error={resource.error}
                        empty={false}
                        emptyTitle=""
                        emptyDescription=""
                        onRetry={resource.refresh}
                        skeleton={
                            <Box
                                className={styles.layout}
                                role="status"
                                aria-busy="true"
                                aria-label={t("loading")}
                            >
                                <Skeleton className={styles.visualSkeleton} />
                                <Flex
                                    direction="column"
                                    gap="4"
                                    className={styles.information}
                                >
                                    <Skeleton className={styles.textSkeleton} />
                                    <Skeleton
                                        className={styles.commentSkeleton}
                                    />
                                    <Skeleton
                                        className={styles.commentSkeleton}
                                    />
                                </Flex>
                            </Box>
                        }
                    >
                        {detail && (
                            <MediaViewerContent
                                key={detail.id}
                                detail={detail}
                                personTag={personTag}
                                signedIn={signedIn}
                                publicUrl={publicUrl}
                                onClose={onClose}
                                onRefresh={resource.refresh}
                                onChanged={onChanged}
                            />
                        )}
                    </FeedContent>
                </LoadErrorContext>
            </Dialog.Body>
        </Dialog>
    );
}
