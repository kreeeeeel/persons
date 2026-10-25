"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { Button, Dialog, Flex } from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";
import { UploadQueue } from "@persons/person-domain/uploads/UploadQueue";
import type { UploadTask } from "@persons/person-domain/uploads/UploadQueue.types";
import { UploadQueueContext } from "@persons/person-domain/uploads/UploadQueueContext";
import { uploadTransfer } from "@persons/person-domain/uploads/uploadTransfer";
import styles from "@persons/person-domain/uploads/UploadQueueProvider/UploadQueueProvider.module.css";

import { UploadRow } from "@persons/person-domain/uploads/UploadRow/UploadRow";

let browserQueue: UploadQueue | undefined;
const EMPTY: readonly UploadTask[] = [];
const serverSnapshot = () => EMPTY;

export function UploadQueueProvider({
    children,
    queue: providedQueue,
}: {
    readonly children: ReactNode;
    readonly queue?: UploadQueue;
}) {
    const t = useTranslate("person");
    const [queue] = useState(() => {
        if (providedQueue) {
            return providedQueue;
        }
        if (typeof window === "undefined") {
            return new UploadQueue(uploadTransfer);
        }
        browserQueue ??= new UploadQueue(uploadTransfer);
        return browserQueue;
    });
    const tasks = useSyncExternalStore(
        queue.subscribe,
        queue.snapshot,
        serverSnapshot,
    );
    const [expanded, setExpanded] = useState(false);
    useEffect(() => {
        const leaving = (event: BeforeUnloadEvent) => {
            if (
                queue
                    .snapshot()
                    .some(
                        (task) =>
                            !["DONE", "ERROR", "CANCELLED"].includes(
                                task.status,
                            ),
                    )
            ) {
                event.preventDefault();
            }
        };
        window.addEventListener("beforeunload", leaving);
        return () => window.removeEventListener("beforeunload", leaving);
    }, [queue]);
    const latest = [...tasks].reverse();
    return (
        <UploadQueueContext value={queue}>
            {children}
            {tasks.length > 0 && !expanded && (
                <Flex
                    direction="column"
                    gap="2"
                    className={styles.stack}
                    aria-label={t("uploads")}
                >
                    {tasks.length > 3 && (
                        <Button
                            view="normal"
                            size="l"
                            onClick={() => setExpanded(true)}
                        >
                            {t("showAllUploads", { count: tasks.length })}
                        </Button>
                    )}
                    {latest.slice(0, 3).map((task) => (
                        <UploadRow key={task.id} task={task} queue={queue} />
                    ))}
                </Flex>
            )}
            {expanded && (
                <Dialog
                    open
                    aria-label={t("uploads")}
                    hasCloseButton
                    fullWidth
                    maxWidth="m"
                    contentOverflow="auto"
                    onClose={() => setExpanded(false)}
                >
                    <Dialog.Header caption={t("uploads")} />
                    <Dialog.Body>
                        <Flex direction="column" gap="3">
                            {latest.map((task) => (
                                <UploadRow
                                    key={task.id}
                                    task={task}
                                    queue={queue}
                                />
                            ))}
                        </Flex>
                    </Dialog.Body>
                </Dialog>
            )}
        </UploadQueueContext>
    );
}
