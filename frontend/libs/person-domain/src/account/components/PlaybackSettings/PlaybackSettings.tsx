"use client";

import { useState } from "react";
import { Alert, Flex, Select, Slider, Switch, Text } from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";
import { usePlaybackPreferences } from "@persons/ui/VideoPlayer/usePlaybackPreferences";
import {
    PLAYBACK_QUALITIES,
    PLAYBACK_SPEEDS,
} from "@persons/ui/VideoPlayer/playbackPreferences";
import type { PlaybackPreferences } from "@persons/ui/VideoPlayer/PlaybackPreferences.types";

import styles from "@persons/person-domain/account/components/PlaybackSettings/PlaybackSettings.module.css";

export function PlaybackSettings() {
    const t = useTranslate("account");
    const { preferences, update } = usePlaybackPreferences();
    const [error, setError] = useState(false);

    function change(value: Partial<PlaybackPreferences>) {
        setError(!update({ ...preferences, ...value }));
    }

    return (
        <Flex direction="column" gap="4">
            <Switch
                size="l"
                checked={preferences.autoplay}
                onUpdate={(autoplay) => change({ autoplay })}
            >
                {t("autoplay")}
            </Switch>
            <Text color="secondary">{t("autoplayDescription")}</Text>
            <Switch
                size="l"
                checked={preferences.muted}
                onUpdate={(muted) => change({ muted })}
            >
                {t("startMuted")}
            </Switch>
            <Flex direction="column" gap="2">
                <Flex
                    alignItems="center"
                    justifyContent="space-between"
                    gap="3"
                >
                    <Text variant="subheader-2">{t("defaultVolume")}</Text>
                    <Text color="secondary">
                        {t("volumePercent", { value: preferences.volume })}
                    </Text>
                </Flex>
                <Slider
                    min={0}
                    max={100}
                    step={1}
                    marks={0}
                    value={preferences.volume}
                    aria-label={t("defaultVolume")}
                    onUpdate={(volume) => change({ volume })}
                    tooltipFormat={(volume) =>
                        t("volumePercent", { value: volume })
                    }
                />
            </Flex>
            <Flex direction="column" gap="2">
                <Text variant="subheader-2">{t("defaultQuality")}</Text>
                <Select
                    size="l"
                    width={180}
                    className={styles.select}
                    value={[preferences.quality]}
                    aria-label={t("defaultQuality")}
                    options={PLAYBACK_QUALITIES.map((value) => ({
                        value,
                        content:
                            value === "original"
                                ? t("originalQuality")
                                : `${value}p`,
                    }))}
                    onUpdate={([value]) => {
                        const quality = PLAYBACK_QUALITIES.find(
                            (item) => item === value,
                        );
                        if (quality) {
                            change({ quality });
                        }
                    }}
                />
                <Text color="secondary">{t("qualityDescription")}</Text>
            </Flex>
            <Flex direction="column" gap="2">
                <Text variant="subheader-2">{t("defaultSpeed")}</Text>
                <Select
                    size="l"
                    width={180}
                    className={styles.select}
                    value={[String(preferences.speed)]}
                    aria-label={t("defaultSpeed")}
                    options={PLAYBACK_SPEEDS.map((value) => ({
                        value: String(value),
                        content: `${value}×`,
                    }))}
                    onUpdate={([value]) => change({ speed: Number(value) })}
                />
            </Flex>
            <Text color="secondary">{t("playbackSavedLocally")}</Text>
            {error && <Alert theme="danger" message={t("playbackSaveError")} />}
        </Flex>
    );
}
