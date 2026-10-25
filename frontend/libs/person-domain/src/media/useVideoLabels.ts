"use client";

import { useTranslate } from "@persons/i18n";

export function useVideoLabels() {
    const t = useTranslate("person");
    return {
        play: t("play"),
        pause: t("pause"),
        mute: t("mute"),
        unmute: t("unmute"),
        seek: t("seek"),
        volume: t("volume"),
        fullscreen: t("fullscreen"),
        fullscreenError: t("fullscreenError"),
        exitFullscreen: t("exitFullscreen"),
        error: t("videoError"),
        retry: t("retry"),
        loading: t("loading"),
        settings: t("playerSettings"),
        speed: t("playbackSpeed"),
        quality: t("videoQuality"),
        original: t("originalQuality"),
    };
}
