"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Box, Flex, Icon, Label, Text } from "@gravity-ui/uikit";
import { Eye } from "@gravity-ui/icons";
import { LoadedImage } from "@persons/ui";
import { TaggedPersonsButton } from "@persons/person-domain/TaggedPersonsButton";
import { VideoPlayer } from "@persons/ui/VideoPlayer";
import { useLocale, useTranslate } from "@persons/i18n";
import { mediaHref, personClient } from "@persons/person-domain/api/browser";
import { compactCount } from "@persons/person-domain/format/compactCount";
import { usePersonMutation } from "@persons/person-domain/hooks/usePersonMutation";
import { CommentsFeed } from "@persons/person-domain/CommentsFeed";
import { CommentAuthor } from "@persons/person-domain/CommentAuthor";
import { MediaEditor } from "@persons/person-domain/MediaEditor";
import { ContentTime } from "@persons/person-domain/ContentTime";
import { MediaReactions } from "@persons/person-domain/MediaReactions";
import { MutationFeedback } from "@persons/person-domain/MutationFeedback";
import { MediaShareButton } from "@persons/person-domain/MediaShareButton";
import { ContentActions } from "@persons/person-domain/ContentActions";
import { useVideoLabels } from "@persons/person-domain/media/useVideoLabels";
import { useMediaQualities } from "@persons/person-domain/media/useMediaQualities";
import type { MediaViewerContentProps } from "@persons/person-domain/MediaViewerContent/MediaViewerContent.types";
import styles from "@persons/person-domain/MediaViewer/MediaViewer.module.css";

export function MediaViewerContent({
    detail,
    personTag,
    signedIn,
    publicUrl,
    onClose,
    onRefresh,
    onChanged,
}: MediaViewerContentProps) {
    const t = useTranslate("person");
    const locale = useLocale();
    const videoLabels = useVideoLabels();
    const qualities = useMediaQualities(detail.id, detail.kind === "MOMENT");
    const [editing, setEditing] = useState(false);
    const [photoAspectRatio, setPhotoAspectRatio] = useState<number>();
    const [viewState, setViewState] = useState<{ id: string; views: number }>();
    const mutation = usePersonMutation();
    const mediaId = detail.id;
    const kind = detail.kind === "MOMENT" ? "MOMENT" : "PHOTO";

    useEffect(() => {
        const controller = new AbortController();
        personClient.gallery
            .recordMediaView(
                { id: mediaId, viewInput: { visitorId: crypto.randomUUID() } },
                { signal: controller.signal },
            )
            .then((result) => {
                if (!controller.signal.aborted) {
                    setViewState({ id: mediaId, views: result.views });
                }
            })
            .catch((error: unknown) => {
                if (!controller.signal.aborted) {
                    console.error(
                        "Unable to record media view",
                        error instanceof Error ? error.name : "Error",
                    );
                }
            });
        return () => controller.abort();
    }, [mediaId]);

    const views =
        viewState?.id === mediaId ? viewState.views : (detail.views ?? 0);

    return (
        <>
            <Box
                className={styles.layout}
                style={
                    {
                        "--media-photo-aspect-ratio": photoAspectRatio,
                    } as CSSProperties
                }
            >
                <Box
                    className={styles.visual}
                    data-kind={detail.kind}
                    onLoadCapture={(event) => {
                        const image = event.target;
                        if (
                            kind === "PHOTO" &&
                            image instanceof HTMLImageElement &&
                            image.naturalWidth > 0 &&
                            image.naturalHeight > 0
                        ) {
                            setPhotoAspectRatio(
                                image.naturalWidth / image.naturalHeight,
                            );
                        }
                    }}
                >
                    {detail.kind === "MOMENT" ? (
                        <VideoPlayer
                            src={mediaHref(mediaId)}
                            poster={
                                detail.previewAvailable
                                    ? `/api/person/v1/media/${mediaId}/preview`
                                    : undefined
                            }
                            title={detail.caption || t("MOMENT")}
                            labels={videoLabels}
                            sources={qualities.sources}
                            processing={qualities.processing}
                            qualityNotice={
                                qualities.error
                                    ? t("qualitiesUnavailable")
                                    : qualities.processing
                                      ? t("qualitiesProcessing")
                                      : undefined
                            }
                            onQualityRetry={
                                qualities.error ? qualities.retry : undefined
                            }
                        />
                    ) : (
                        <LoadedImage
                            responsive
                            src={mediaHref(mediaId)}
                            alt={detail.caption || t("PHOTO")}
                            width={1200}
                            height={900}
                        />
                    )}
                    {detail.moderationStatus === "PENDING" && (
                        <Label theme="warning" className={styles.pending}>
                            {t("onModeration")}
                        </Label>
                    )}
                </Box>
                <Flex direction="column" className={styles.information}>
                    <Flex
                        alignItems="center"
                        gap="3"
                        className={styles.publisher}
                    >
                        <CommentAuthor
                            comment={{
                                authorName:
                                    detail.authorName || t("unknownAuthor"),
                                authorTag: detail.authorTag,
                                authorAvatarMediaId: detail.authorAvatarMediaId,
                                authorAvatarUrl: detail.authorAvatarUrl,
                            }}
                            publicUrl={publicUrl}
                            interactive
                            prominent
                            metadata={
                                <ContentTime
                                    date={detail.createdAt}
                                    className={styles.date}
                                />
                            }
                        />
                    </Flex>
                    <ContentActions
                        className={styles.captionActions}
                        pending={mutation.pending}
                        onEdit={
                            detail.canEdit ? () => setEditing(true) : undefined
                        }
                        onRemove={
                            detail.canRemove
                                ? () =>
                                      mutation.run(
                                          () =>
                                              personClient.media.deleteMedia({
                                                  id: mediaId,
                                              }),
                                          (receipt) => {
                                              if (
                                                  receipt.status === "APPROVED"
                                              ) {
                                                  onChanged?.();
                                                  onClose();
                                              }
                                          },
                                      )
                                : undefined
                        }
                    >
                        <Text as="h2" className={styles.caption}>
                            {detail.caption || t(detail.kind)}
                        </Text>
                    </ContentActions>
                    <Flex
                        alignItems="center"
                        justifyContent="space-between"
                        gap="2"
                        wrap
                        className={styles.actions}
                    >
                        <Flex
                            gap="2"
                            alignItems="center"
                            className={styles.reactions}
                        >
                            <MediaReactions
                                key={mediaId}
                                mediaId={mediaId}
                                initial={detail.reactions}
                                signedIn={signedIn}
                                disabled={detail.canInteract === false}
                            />
                            {detail.canInteract !== false &&
                                detail.moderationStatus !== "PENDING" && (
                                    <MediaShareButton
                                        personTag={personTag}
                                        mediaId={mediaId}
                                        kind={kind}
                                        publicUrl={publicUrl}
                                    />
                                )}
                        </Flex>
                        <Flex
                            alignItems="center"
                            gap="1"
                            className={styles.metrics}
                        >
                            <Flex
                                gap="1"
                                alignItems="center"
                                className={styles.views}
                                aria-label={t("mediaViews", { count: views })}
                            >
                                <Icon data={Eye} size={20} />
                                <Text>{compactCount(views, locale)}</Text>
                            </Flex>
                            <TaggedPersonsButton
                                persons={detail.taggedPersons}
                                publicUrl={publicUrl}
                            />
                        </Flex>
                    </Flex>
                    <MutationFeedback {...mutation} />
                    {detail.canInteract !== false && (
                        <Box
                            as="section"
                            className={styles.comments}
                            aria-label={t("comments")}
                        >
                            <CommentsFeed
                                personId={detail.personId}
                                mediaId={mediaId}
                                signedIn={signedIn}
                                publicUrl={publicUrl}
                                showHeading
                                layout="media"
                            />
                        </Box>
                    )}
                </Flex>
            </Box>
            {editing && (
                <MediaEditor
                    detail={detail}
                    onClose={() => setEditing(false)}
                    onSaved={(receipt) => {
                        setEditing(false);
                        mutation.notify(receipt);
                        onRefresh();
                        onChanged?.();
                    }}
                />
            )}
        </>
    );
}
