"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Flex, Icon, Text } from "@gravity-ui/uikit";
import { ArrowDownToLine, Check, Link as LinkIcon } from "@gravity-ui/icons";
import { useTranslate } from "@persons/i18n";
import { mediaShareLink } from "@persons/person-domain/media/shareLink";
import type { MediaShareButtonProps } from "@persons/person-domain/MediaShareButton/MediaShareButton.types";
import { mediaHref } from "@persons/person-domain/api/browser";
import styles from "@persons/person-domain/MediaShareButton/MediaShareButton.module.css";

const FEEDBACK_DURATION_MS = 2200;

export function MediaShareButton({
    personTag,
    mediaId,
    kind,
    publicUrl,
}: MediaShareButtonProps) {
    const t = useTranslate("person");
    const [status, setStatus] = useState<"copied" | "error">();
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);
    const label = t(status === "copied" ? "mediaLinkCopied" : "shareMedia");

    async function copy() {
        clearTimeout(timer.current);
        try {
            await navigator.clipboard.writeText(
                mediaShareLink(
                    publicUrl ?? window.location.origin,
                    personTag,
                    kind,
                    mediaId,
                ),
            );
            setStatus("copied");
        } catch {
            setStatus("error");
        }
        timer.current = setTimeout(
            () => setStatus(undefined),
            FEEDBACK_DURATION_MS,
        );
    }

    return (
        <Flex gap="1" alignItems="center" className={styles.pill}>
            <Button
                size="l"
                view="flat"
                pin="circle-circle"
                className={styles.action}
                href={mediaHref(mediaId)}
                download=""
                aria-label={t("downloadMedia")}
                title={t("downloadMedia")}
            >
                <Icon data={ArrowDownToLine} size={20} />
            </Button>
            <Button
                size="l"
                view="flat"
                aria-label={label}
                title={label}
                onClick={copy}
                className={styles.action}
                pin="circle-circle"
            >
                <Icon
                    key={status}
                    data={status === "copied" ? Check : LinkIcon}
                    size={20}
                    className={styles.icon}
                />
            </Button>
            {status && (
                <Text
                    role={status === "error" ? "alert" : "status"}
                    className={styles.notice}
                    color={status === "error" ? "danger" : "primary"}
                >
                    {t(
                        status === "error"
                            ? "mediaLinkCopyError"
                            : "mediaLinkCopied",
                    )}
                </Text>
            )}
        </Flex>
    );
}
