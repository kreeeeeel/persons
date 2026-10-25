"use client";

import { LoadedImage } from "@persons/ui";
import { useTranslate } from "@persons/i18n";
import type { EmptyIllustrationProps } from "@persons/person-domain/EmptyIllustration/EmptyIllustration.types";

const FILES = {
    wall: ["empty-wall-krel-v2", "emptyWallArt", 960],
    comments: ["empty-comments-slava-v1", "emptyCommentsArt", 720],
    ratings: ["empty-ratings-yuri-v1", "emptyRatingsArt", 960],
    photos: ["empty-photos-tyamik-v1", "emptyPhotosArt", 960],
    media: ["empty-media-nikita-v2", "emptyMediaArt", 960],
    history: ["empty-loans-vadim-v3", "emptyHistoryArt", 960],
    achievements: ["empty-achievements-evgeny-v2", "emptyAchievementsArt", 960],
    notifications: [
        "empty-notifications-stepa-v2",
        "emptyNotificationsArt",
        960,
    ],
    search: ["empty-search-artem-v1", "emptySearchArt", 720],
    sessions: ["empty-sessions-nikita-v1", "emptySessionsArt", 720],
    restrictions: ["empty-restrictions-yuri-v1", "emptyRestrictionsArt", 720],
    publications: ["empty-publications-krel-v1", "emptyPublicationsArt", 720],
    moderation: ["empty-moderation-slava-v1", "emptyModerationArt", 720],
    settings: ["empty-settings-evgeny-v1", "emptySettingsArt", 720],
    "my-page": ["empty-my-page-slava-v2", "emptyMyPageArt", 960],
} as const;

export function EmptyIllustration({ kind }: EmptyIllustrationProps) {
    const t = useTranslate("person");
    const [file, alt, width] = FILES[kind];
    return (
        <LoadedImage
            src={`/media/${file}.webp`}
            alt={t(alt)}
            width={width}
            height={720}
            responsive
        />
    );
}
