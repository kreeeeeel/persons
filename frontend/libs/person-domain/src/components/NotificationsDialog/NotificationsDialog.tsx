"use client";
import { LoadErrorContext } from "@persons/ui/loading/LoadErrorContext";

import { useCallback, useState, useTransition } from "react";
import { Alert, Dialog, Flex, Label, Link, Text } from "@gravity-ui/uikit";
import { useLocale, useTranslate } from "@persons/i18n";
import { personClient, personError } from "@persons/person-domain/api/browser";
import { useInfinitePersonData } from "@persons/person-domain/hooks/useInfinitePersonData";
import { FeedContent } from "@persons/person-domain/FeedContent";
import { InfiniteFeedLoader } from "@persons/person-domain/InfiniteFeedLoader";
import type { NotificationsDialogProps } from "@persons/person-domain/NotificationsDialog/NotificationsDialog.types";
import styles from "@persons/person-domain/NotificationsDialog/NotificationsDialog.module.css";

const PAGE_SIZE = 12;

export function NotificationsDialog({
    onClose,
    publicUrl,
    onRead,
}: NotificationsDialogProps) {
    const t = useTranslate("person");
    const locale = useLocale();
    const [error, setError] = useState<string>();
    const [pending, startTransition] = useTransition();
    const load = useCallback(
        (page: number, signal: AbortSignal) =>
            personClient.notifications.listNotifications(
                { page, size: PAGE_SIZE },
                { signal },
            ),
        [],
    );
    const resource = useInfinitePersonData(`notifications`, load);

    return (
        <Dialog
            open
            onClose={onClose}
            maxWidth="m"
            fullWidth
            contentOverflow="auto"
        >
            <Dialog.Header caption={t("notifications")} />
            <Dialog.Body>
                <LoadErrorContext value="dialog">
                    <Flex direction="column" gap="4">
                        {error && <Alert theme="danger" message={t(error)} />}
                        <FeedContent
                            illustration="notifications"
                            loading={resource.loading}
                            error={resource.error}
                            empty={!resource.data?.items.length}
                            emptyTitle={t("notificationsEmpty")}
                            emptyDescription={t("notificationsDescription")}
                            onRetry={resource.refresh}
                        >
                            {resource.data?.items.map((item) => (
                                <Flex
                                    key={item.id}
                                    direction="column"
                                    gap="2"
                                    className={styles.item}
                                >
                                    <Flex
                                        alignItems="center"
                                        justifyContent="space-between"
                                        gap="2"
                                        wrap
                                    >
                                        <Label
                                            theme={
                                                item.kind === "APPROVED"
                                                    ? "success"
                                                    : item.kind === "REMOVED"
                                                      ? "danger"
                                                      : "warning"
                                            }
                                        >
                                            {t(item.kind)}
                                        </Label>
                                        <Text color="secondary">
                                            {new Intl.DateTimeFormat(locale, {
                                                dateStyle: "medium",
                                                timeStyle: "short",
                                            }).format(item.createdAt)}
                                        </Text>
                                    </Flex>
                                    <Text className={styles.subject}>
                                        {item.subject}
                                    </Text>
                                    {item.reason && (
                                        <Text color="secondary">
                                            {item.reason}
                                        </Text>
                                    )}
                                    <Link
                                        href={
                                            publicUrl
                                                ? new URL(
                                                      `/${item.personTag}`,
                                                      publicUrl,
                                                  ).href
                                                : `/${item.personTag}`
                                        }
                                        onClick={onClose}
                                    >
                                        @{item.personTag}
                                    </Link>
                                </Flex>
                            ))}
                        </FeedContent>
                        <InfiniteFeedLoader {...resource} />
                    </Flex>
                </LoadErrorContext>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t("close")}
                onClickButtonCancel={onClose}
                textButtonApply={t("markRead")}
                propsButtonApply={{
                    disabled: !resource.data?.unread || pending,
                }}
                loading={pending}
                onClickButtonApply={() =>
                    startTransition(async () => {
                        setError(undefined);

                        try {
                            await personClient.notifications.readNotifications();
                            onRead?.();
                            resource.refresh();
                        } catch (failure) {
                            setError(await personError(failure));
                        }
                    })
                }
            />
        </Dialog>
    );
}
