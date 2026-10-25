"use client";

import { Box, Button, Flex, Icon, Progress, Text } from "@gravity-ui/uikit";
import { Check, Clock, Picture, Video, Xmark } from "@gravity-ui/icons";
import { useTranslate } from "@persons/i18n";
import type { UploadTask } from "@persons/person-domain/uploads/UploadQueue.types";
import type { UploadQueue } from "@persons/person-domain/uploads/UploadQueue";
import styles from "@persons/person-domain/uploads/UploadRow/UploadRow.module.css";

export function UploadRow({
    task,
    queue,
}: {
    readonly task: UploadTask;
    readonly queue: UploadQueue;
}) {
    const t = useTranslate("person");
    const finished = ["DONE", "ERROR", "CANCELLED"].includes(task.status);
    return (
        <Flex alignItems="center" gap="3" className={styles.row} role="status">
            <Icon
                data={
                    task.status === "QUEUED"
                        ? Clock
                        : task.status === "DONE"
                          ? Check
                          : task.kind === "PHOTO"
                            ? Picture
                            : Video
                }
                size={24}
            />
            <Flex direction="column" gap="2" className={styles.content}>
                <Text className={styles.filename} title={task.filename}>
                    {t(`upload${task.status}`, { name: task.filename })}
                </Text>
                {finished ? (
                    <Text
                        color={task.status === "ERROR" ? "danger" : "secondary"}
                    >
                        {task.status === "DONE"
                            ? t(
                                  task.receipt?.status === "PENDING"
                                      ? "onModeration"
                                      : "published",
                              )
                            : task.status === "ERROR"
                              ? t(task.error ?? "UNAVAILABLE")
                              : t("uploadCancelled")}
                    </Text>
                ) : (
                    <Box
                        role="progressbar"
                        aria-label={task.filename}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={task.progress}
                    >
                        <Progress
                            value={task.progress}
                            text={`${task.progress}%`}
                            size="m"
                            theme="misc"
                            loading={task.status !== "QUEUED"}
                        />
                    </Box>
                )}
            </Flex>
            <Button
                size="l"
                view="flat"
                pin="circle-circle"
                aria-label={t(finished ? "dismissUpload" : "cancelUpload", {
                    name: task.filename,
                })}
                onClick={() => queue.cancel(task.id)}
            >
                <Icon data={Xmark} size={20} />
            </Button>
        </Flex>
    );
}
