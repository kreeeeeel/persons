"use client";

import { VideoPlayer } from "@persons/ui/VideoPlayer";
import { mediaHref } from "@persons/person-domain/api/browser";
import { useMediaQualities } from "@persons/person-domain/media/useMediaQualities";
import { useVideoLabels } from "@persons/person-domain/media/useVideoLabels";
import { useTranslate } from "@persons/i18n";

export function MediaVideoPlayer({
    id,
    title,
    poster,
}: {
    readonly id: string;
    readonly title: string;
    readonly poster?: string;
}) {
    const t = useTranslate("person");
    const labels = useVideoLabels();
    const qualities = useMediaQualities(id, true);
    return (
        <VideoPlayer
            src={mediaHref(id)}
            title={title}
            poster={poster}
            labels={labels}
            sources={qualities.sources}
            processing={qualities.processing}
            qualityNotice={
                qualities.processing
                    ? t("qualitiesProcessing")
                    : qualities.error
                      ? t("qualitiesUnavailable")
                      : undefined
            }
            onQualityRetry={qualities.error ? qualities.retry : undefined}
        />
    );
}
