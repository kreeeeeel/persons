"use client";

import { useState } from "react";
import { Alert, Dialog, Flex } from "@gravity-ui/uikit";
import { AvatarPicker } from "@persons/photo-editor";
import { useTranslate } from "@persons/i18n";
import { personClient, personError } from "@persons/person-domain/api/browser";
import type { MediaUploaderProps } from "@persons/person-domain/MediaUploader/MediaUploader.types";

export function PersonAvatarUploader({
    personId,
    onClose,
    onSaved,
}: Omit<MediaUploaderProps, "kind">) {
    const t = useTranslate("person");
    const [avatar, setAvatar] = useState<string>();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string>();
    async function save() {
        if (!avatar || pending) {
            return;
        }
        setPending(true);
        setError(undefined);
        try {
            const blob = await (await fetch(avatar)).blob();
            const receipt = await personClient.media.uploadMedia({
                id: personId,
                kind: "AVATAR",
                file: new File([blob], "avatar.jpg", { type: blob.type }),
            });
            onSaved(receipt);
        } catch (failure) {
            setError(await personError(failure));
        } finally {
            setPending(false);
        }
    }
    return (
        <Dialog
            open
            hasCloseButton
            fullWidth
            maxWidth="s"
            onClose={() => {
                if (!pending) {
                    onClose();
                }
            }}
        >
            <Dialog.Header caption={t("AVATAR")} />
            <Dialog.Body>
                <Flex direction="column" gap="4">
                    {error && <Alert theme="danger" message={t(error)} />}
                    <AvatarPicker
                        name={t("AVATAR")}
                        value={avatar}
                        onChange={setAvatar}
                        disabled={pending}
                    />
                </Flex>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t("cancel")}
                onClickButtonCancel={onClose}
                textButtonApply={t("upload")}
                onClickButtonApply={() => void save()}
                loading={pending}
                propsButtonApply={{ disabled: !avatar || pending }}
            />
        </Dialog>
    );
}
