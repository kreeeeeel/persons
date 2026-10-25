"use client";

import { useLocale, useTranslate } from "@persons/i18n";
import { Box, Button, Flex, Icon, Text } from "@gravity-ui/uikit";
import {
    Display,
    LogoAndroid,
    LogoApple,
    LogoLinux,
    LogoMacos,
    LogoWindows,
    Xmark,
} from "@gravity-ui/icons";
import type { SessionCardProps } from "@persons/person-domain/account/components/SessionCard/SessionCard.types";
import styles from "@persons/person-domain/account/components/SessionCard/SessionCard.module.css";

const ICON_SIZE_24 = 24;
const SMALL_ICON_SIZE = 16;

function osIcon(os: string) {
    const name = os.toLowerCase();

    if (name.includes("windows")) {
        return LogoWindows;
    }
    if (name.includes("android")) {
        return LogoAndroid;
    }
    if (name.includes("ios")) {
        return LogoApple;
    }
    if (name.includes("mac")) {
        return LogoMacos;
    }
    if (name.includes("linux")) {
        return LogoLinux;
    }

    return Display;
}

function isLocal(ip: string) {
    return /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd)/i.test(
        ip,
    );
}

export function SessionCard({ session, pending, onRevoke }: SessionCardProps) {
    const t = useTranslate("account");
    const locale = useLocale();
    const region =
        session.region ||
        t(isLocal(session.ip) ? "localNetwork" : "regionUnknown");
    const time = new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(session.createdAt));
    const client = t("sessionClient", {
        client: session.browser || t("clientUnknown"),
        os:
            [session.os, session.osVersion].filter(Boolean).join(" ") ||
            t("osUnknown"),
    });

    return (
        <Box className={styles.card}>
            <Box className={styles.os}>
                <Icon data={osIcon(session.os)} size={ICON_SIZE_24} />
            </Box>
            <Flex direction="column" className={styles.details}>
                <Text variant="body-2" className={styles.client} title={client}>
                    {client}
                </Text>
                <Text
                    as="time"
                    dateTime={session.createdAt}
                    variant="body-2"
                    color="secondary"
                    className={styles.location}
                >
                    {t("sessionLocation", { region, time })}
                </Text>
            </Flex>
            <Button
                view="flat"
                size="l"
                className={styles.revoke}
                disabled={pending}
                onClick={onRevoke}
                aria-label={t("endSession")}
            >
                <Icon data={Xmark} size={SMALL_ICON_SIZE} />
            </Button>
        </Box>
    );
}
