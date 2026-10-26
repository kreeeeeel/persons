"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Dialog, Flex, Text } from "@gravity-ui/uikit";
import { LoadedImage } from "@persons/ui";
import { FileDropDialog } from "@persons/ui/FileDropDialog";
import { VideoPlayer } from "@persons/ui/VideoPlayer";
import { LabeledTextInput as TextInput } from "@persons/ui/LabeledTextInput";
import { useTranslate } from "@persons/i18n";
import { PersonPicker } from "@persons/person-domain/PersonPicker";
import {
    isQuickTimeFile,
    videoUploadAccept,
} from "@persons/person-domain/media/videoFiles";
import { mediaUploadLimits } from "@persons/person-domain/media/uploadLimits";
import { uploadFileKind } from "@persons/person-domain/media/uploadFileKind";
import { useVideoLabels } from "@persons/person-domain/media/useVideoLabels";
import { useUploadQueue } from "@persons/person-domain/uploads/UploadQueueContext";
import type { UploadDraft } from "@persons/person-domain/MediaFilesUploader/UploadDraft";
import type { MediaUploaderProps } from "@persons/person-domain/MediaUploader/MediaUploader.types";
import styles from "@persons/person-domain/MediaFilesUploader/MediaFilesUploader.module.css";

export function MediaFilesUploader({
    personId,
    kind,
    onClose,
}: Omit<MediaUploaderProps, "onSaved"> & {
    readonly kind?: "PHOTO" | "MOMENT";
}) {
    const t = useTranslate("person");
    const labels = useVideoLabels();
    const queue = useUploadQueue();
    const [drafts, setDrafts] = useState<UploadDraft[]>([]);
    const [index, setIndex] = useState(0);
    const [error, setError] = useState<string>();
    const urls = useRef<string[]>([]);
    useEffect(
        () => () => urls.current.forEach((url) => URL.revokeObjectURL(url)),
        [],
    );
    const current = drafts[index];
    const accept =
        kind === "MOMENT"
            ? videoUploadAccept
            : kind === "PHOTO"
              ? "image/jpeg,image/png"
              : `image/jpeg,image/png,${videoUploadAccept}`;
    function select(files: File[]) {
        if (!files.length) {
            return;
        }
        const issue = files.some((file) => {
            const selectedKind = uploadFileKind(file);
            return selectedKind && file.size > mediaUploadLimits[selectedKind];
        })
            ? "MEDIA_TOO_LARGE"
            : files.some(
                    (file) =>
                        !file.size ||
                        !uploadFileKind(file) ||
                        (kind !== undefined && uploadFileKind(file) !== kind),
                )
              ? "INVALID_MEDIA"
              : undefined;
        setError(issue);
        if (issue) {
            return;
        }
        setDrafts(
            files.map((file): UploadDraft => {
                const url = URL.createObjectURL(file);
                urls.current.push(url);
                return {
                    file,
                    url,
                    kind: uploadFileKind(file) as "PHOTO" | "MOMENT",
                    caption: "",
                    people: [],
                };
            }),
        );
        setIndex(0);
    }
    function update(patch: Partial<UploadDraft>) {
        setDrafts((values) =>
            values.map((draft, position) =>
                position === index ? { ...draft, ...patch } : draft,
            ),
        );
    }
    if (!current) {
        return (
            <FileDropDialog
                title={t("uploadFile")}
                description={t("dropFileDescription")}
                chooseLabel={t("chooseFile")}
                hint={t(
                    kind === "MOMENT"
                        ? "videoHint"
                        : kind === "PHOTO"
                          ? "imageHint"
                          : "mediaHint",
                )}
                accept={accept}
                multiple
                illustration="/media/upload-evgeny-v1.webp"
                illustrationAlt={t("uploadIllustration")}
                error={error && t(error)}
                onSelect={select}
                onClose={onClose}
            />
        );
    }
    return (
        <Dialog
            open
            modalClassName={styles.modal}
            hasCloseButton
            fullWidth
            maxWidth="m"
            contentOverflow="auto"
            disableHeightTransition
            onClose={onClose}
            aria-label={t("uploadPreview")}
        >
            <Dialog.Header
                caption={t(
                    current.kind === "PHOTO" ? "photoPreview" : "videoPreview",
                )}
            />
            <Dialog.Body>
                <Flex direction="column" gap="4">
                    {drafts.length > 1 && (
                        <Flex gap="2" wrap aria-label={t("selectedFiles")}>
                            {drafts.map((draft, position) => (
                                <Button
                                    key={draft.url}
                                    size="l"
                                    selected={position === index}
                                    onClick={() => setIndex(position)}
                                >
                                    {position + 1}
                                </Button>
                            ))}
                        </Flex>
                    )}
                    <Text className={styles.filename}>{current.file.name}</Text>
                    {current.kind === "MOMENT" &&
                        isQuickTimeFile(current.file) && (
                            <Text color="secondary">{t("movHint")}</Text>
                        )}
                    <Flex justifyContent="center" className={styles.preview}>
                        {current.kind === "MOMENT" ? (
                            <VideoPlayer
                                key={current.url}
                                src={current.url}
                                title={current.file.name}
                                labels={labels}
                            />
                        ) : (
                            <LoadedImage
                                key={current.url}
                                src={current.url}
                                alt={current.file.name}
                                width={1200}
                                height={900}
                                responsive
                            />
                        )}
                    </Flex>
                    <TextInput
                        size="xl"
                        label={t("caption")}
                        value={current.caption}
                        onUpdate={(caption) => update({ caption })}
                        controlProps={{
                            "aria-label": t("caption"),
                            maxLength: 200,
                        }}
                    />
                    <PersonPicker
                        value={current.people}
                        onChange={(people) => update({ people })}
                    />
                </Flex>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t("cancel")}
                onClickButtonCancel={onClose}
                textButtonApply={t("upload")}
                onClickButtonApply={() => {
                    queue.enqueue(
                        drafts.map((draft) => ({
                            personId,
                            kind: draft.kind,
                            file: draft.file,
                            caption: draft.caption,
                            taggedPersonIds: draft.people.map(({ id }) => id),
                        })),
                    );
                    onClose();
                }}
            />
        </Dialog>
    );
}
