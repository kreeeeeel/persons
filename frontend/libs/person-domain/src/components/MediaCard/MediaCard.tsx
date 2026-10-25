"use client";

import { useState } from "react";
import { Box, Flex, Icon, Label, Skeleton, Text } from "@gravity-ui/uikit";
import { PlayFill, Eye } from "@gravity-ui/icons";
import { LoadedImage } from "@persons/ui";
import { useLocale, useTranslate } from "@persons/i18n";
import { compactCount } from "@persons/person-domain/format/compactCount";
import { mediaHref } from "@persons/person-domain/api/browser";
import type { MediaCardProps } from "@persons/person-domain/MediaCard/MediaCard.types";
import styles from "@persons/person-domain/MediaCard/MediaCard.module.css";

function time(seconds: number) {
    const duration = Math.max(0, Math.floor(seconds));
    return `${Math.floor(duration / 60)
        .toString()
        .padStart(2, "0")}:${(duration % 60).toString().padStart(2, "0")}`;
}

export function MediaCard({
    item,
    kind,
    onOpen,
    showViews = true,
}: MediaCardProps) {
    const t = useTranslate("person");
    const locale = useLocale();
    const [duration, setDuration] = useState(item.durationSeconds || 0);
    const video = kind === "MOMENT";
    return (
        <Flex direction="column" gap="3" className={styles.card}>
            <Box
                as="button"
                type="button"
                onClick={onOpen}
                className={styles.preview}
                aria-label={item.title || t(kind)}
            >
                {!video ? (
                    <LoadedImage
                        responsive
                        objectFit="cover"
                        width={640}
                        height={480}
                        src={mediaHref(item.mediaId)}
                        alt=""
                    />
                ) : (
                    <>
                        {item.previewAvailable ? (
                            <LoadedImage
                                responsive
                                objectFit="cover"
                                width={640}
                                height={480}
                                src={`/api/person/v1/media/${item.mediaId}/preview`}
                                alt=""
                            />
                        ) : (
                            <Box
                                as="video"
                                src={`${mediaHref(item.mediaId)}#t=0.1`}
                                preload="metadata"
                                muted
                                playsInline
                                aria-hidden
                                onLoadedMetadata={(event) => {
                                    const video =
                                        event.currentTarget as unknown as HTMLVideoElement;
                                    setDuration(
                                        Number.isFinite(video.duration)
                                            ? video.duration
                                            : 0,
                                    );
                                }}
                            />
                        )}
                        <Box className={styles.play}>
                            <Icon data={PlayFill} size={28} />
                        </Box>
                        <Box className={styles.duration}>
                            {duration ? (
                                time(duration)
                            ) : (
                                <Skeleton className={styles.timeSkeleton} />
                            )}
                        </Box>
                    </>
                )}
                {item.moderationStatus === "PENDING" && (
                    <Label theme="warning" className={styles.pending}>
                        {t("onModeration")}
                    </Label>
                )}
            </Box>
            <Text className={styles.caption}>{item.title || t(kind)}</Text>
            {showViews && (
                <Flex alignItems="center" gap="2">
                    <Icon data={Eye} size={18} />
                    <Text
                        color="secondary"
                        aria-label={t("mediaViews", { count: item.views ?? 0 })}
                    >
                        {compactCount(item.views ?? 0, locale)}
                    </Text>
                </Flex>
            )}
        </Flex>
    );
}
