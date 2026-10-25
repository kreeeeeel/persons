"use client";

import { Box, Flex, Text } from "@gravity-ui/uikit";
import { LoadedImage } from "@persons/ui";
import { useLocale, useTranslate } from "@persons/i18n";
import type { RestrictionNoticeProps } from "@persons/person-domain/RestrictionNotice/RestrictionNotice.types";
import styles from "@persons/person-domain/RestrictionNotice/RestrictionNotice.module.css";

export function RestrictionNotice({
    restriction,
    scope,
}: RestrictionNoticeProps) {
    const locale = useLocale();
    const t = useTranslate("person");
    const until = restriction.expiresAt
        ? new Intl.DateTimeFormat(locale, {
              dateStyle: "long",
              timeStyle: "short",
              timeZone: "Europe/Moscow",
          }).format(restriction.expiresAt)
        : undefined;
    return (
        <Flex
            direction="column"
            alignItems="center"
            gap="4"
            className={styles.notice}
        >
            <Box
                className={
                    scope === "ACCOUNT"
                        ? `${styles.art} ${styles.fullArt}`
                        : styles.art
                }
            >
                <LoadedImage
                    src="/media/restricted-vadim-v1.webp"
                    alt={t("restrictedArt")}
                    width={512}
                    height={768}
                    responsive
                />
            </Box>
            <Text as="h1" variant="header-1">
                {t(`restriction${scope}`)}
            </Text>
            <Text className={styles.reason}>{restriction.reason}</Text>
            <Text color="secondary">
                {until
                    ? t("restrictedUntil", { date: until })
                    : t("restrictedForever")}
            </Text>
        </Flex>
    );
}
