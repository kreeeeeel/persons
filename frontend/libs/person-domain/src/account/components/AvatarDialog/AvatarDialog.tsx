"use client";

import { useState } from "react";
import { Box, Button, Dialog, Text } from "@gravity-ui/uikit";
import { AvatarPicker } from "@persons/photo-editor";
import { useTranslate } from "@persons/i18n";
import { RequestError } from "@persons/ui/loading/RequestError";
import { PendingButton } from "@persons/person-domain/account/components/PendingButton/PendingButton";
import type { AvatarDialogProps } from "@persons/person-domain/account/components/AvatarDialog/AvatarDialog.types";
import styles from "@persons/person-domain/account/components/AccountDialog/AccountDialog.module.css";

import avatarStyles from "@persons/person-domain/account/components/AvatarDialog/AvatarDialog.module.css";

export function AvatarDialog({
    embedded = false,
    name,
    current,
    onClose,
    onSaved,
    saveAvatar,
}: AvatarDialogProps) {
    const t = useTranslate("account");
    const common = useTranslate("common");
    const [avatar, setAvatar] = useState<string>();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);
    const [editing, setEditing] = useState(false);

    async function save(event: { preventDefault: () => void }) {
        event.preventDefault();

        if (!avatar || pending) {
            return;
        }

        setPending(true);
        setError("");
        setSaved(false);
        const result = await saveAvatar(avatar);
        setPending(false);

        if (result.ok) {
            onSaved(avatar);
            if (embedded) {
                setAvatar(undefined);
                setSaved(true);
            }
        } else {
            setError(result.code);
        }
    }

    const cancelButton = (
        <Button
            view="flat"
            width={embedded ? "max" : "auto"}
            size="xl"
            onClick={() => {
                if (embedded) {
                    setAvatar(undefined);
                    setError("");
                    setSaved(false);
                } else {
                    onClose();
                }
            }}
            disabled={pending}
        >
            {common("cancel")}
        </Button>
    );

    const saveButton = (
        <PendingButton
            pending={pending}
            disabled={!avatar}
            width={embedded ? "max" : "auto"}
        >
            {common("save")}
        </PendingButton>
    );

    const body = (
        <Box as="form" onSubmit={save} className={styles.form}>
            <AvatarPicker
                name={name}
                value={avatar ?? current}
                onChange={(image) => {
                    setAvatar(image);
                    setSaved(false);
                }}
                inlineEditor={embedded}
                onEditingChange={(value) => {
                    setEditing(value);
                    if (value) {
                        setSaved(false);
                        setError("");
                    }
                }}
                disabled={pending}
            />
            {error && (
                <RequestError code={error}>
                    <Text role="alert" color="danger">
                        {t(error)}
                    </Text>
                </RequestError>
            )}
            {saved && (
                <Text role="status" color="positive">
                    {t("avatarSaved")}
                </Text>
            )}
            {(!embedded || !editing) && (
                <Box
                    className={embedded ? avatarStyles.actions : styles.actions}
                >
                    {embedded ? (
                        <>
                            {saveButton}
                            {cancelButton}
                        </>
                    ) : (
                        <>
                            {cancelButton}
                            {saveButton}
                        </>
                    )}
                </Box>
            )}
        </Box>
    );

    if (embedded) {
        return body;
    }

    return (
        <Dialog
            open
            fullWidth
            maxWidth="s"
            hasCloseButton
            aria-label={t("avatar")}
            onClose={() => {
                if (!pending) {
                    onClose();
                }
            }}
        >
            <Dialog.Header caption={t("avatar")} />
            <Dialog.Body className={styles.body}>{body}</Dialog.Body>
        </Dialog>
    );
}
