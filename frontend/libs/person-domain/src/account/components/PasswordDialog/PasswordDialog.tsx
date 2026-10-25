"use client";

import { RequestError } from "@persons/ui/loading/RequestError";

import { useState } from "react";
import { useTranslate } from "@persons/i18n";
import { Box, Button, Dialog, PasswordInput, Text } from "@gravity-ui/uikit";
import { PendingButton } from "@persons/person-domain/account/components/PendingButton/PendingButton";
import type { PasswordDialogProps } from "@persons/person-domain/account/components/PasswordDialog/PasswordDialog.types";
import styles from "@persons/person-domain/account/components/AccountDialog/AccountDialog.module.css";

const MAX_PASSWORD_BYTES = 72;
const MIN_LENGTH_1 = 1;
const MIN_PASSWORD_LENGTH = 10;

export function PasswordDialog({
    onClose,
    embedded = false,
    changePassword,
}: PasswordDialogProps) {
    const t = useTranslate("account");
    const [currentPassword, setCurrentPassword] = useState("");
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    async function submit(event: { preventDefault: () => void }) {
        event.preventDefault();

        if (pending) {
            return;
        }

        setPending(true);
        setError("");

        const result = await changePassword({
            currentPassword,
            password,
            confirmation,
        });

        setPending(false);

        if (result.ok) {
            setCurrentPassword("");
            setPassword("");
            setConfirmation("");
            setSuccess(true);
        } else {
            setError(result.code);
        }
    }

    const body = (
        <Box className={styles.body}>
            {success ? (
                <Box className={styles.success}>
                    <Text variant="body-3">
                        {t("passwordUpdatedDescription")}
                    </Text>
                    <Button view="action" size="xl" onClick={onClose}>
                        {t("done")}
                    </Button>
                </Box>
            ) : (
                <Box
                    as="form"
                    className={styles.form}
                    onSubmit={submit}
                    autoComplete="off"
                >
                    {[
                        {
                            id: "current-password",
                            label: "currentPassword",
                            value: currentPassword,
                            update: setCurrentPassword,
                            auto: "off",
                        },
                        {
                            id: "new-password",
                            label: "newPassword",
                            value: password,
                            update: setPassword,
                            auto: "new-password",
                        },
                        {
                            id: "confirm-password",
                            label: "confirmPassword",
                            value: confirmation,
                            update: setConfirmation,
                            auto: "new-password",
                        },
                    ].map((field) => (
                        <Box className={styles.field} key={field.id}>
                            <Text
                                as="label"
                                htmlFor={field.id}
                                variant="body-3"
                            >
                                {t(field.label)}
                            </Text>
                            <PasswordInput
                                id={field.id}
                                value={field.value}
                                onUpdate={field.update}
                                autoComplete={field.auto}
                                size="xl"
                                disabled={pending}
                                hideCopyButton
                                controlProps={{
                                    required: true,
                                    maxLength: MAX_PASSWORD_BYTES,
                                    minLength:
                                        field.id === "current-password"
                                            ? MIN_LENGTH_1
                                            : MIN_PASSWORD_LENGTH,
                                }}
                            />
                        </Box>
                    ))}
                    <Text variant="body-2" color="secondary">
                        {t("passwordHint")} {t("passwordNotice")}
                    </Text>
                    {error && (
                        <RequestError code={error}>
                            <Text role="alert" className={styles.error}>
                                {t(error)}
                            </Text>
                        </RequestError>
                    )}
                    <PendingButton
                        pending={pending}
                        disabled={
                            !currentPassword || !password || !confirmation
                        }
                    >
                        {t("password")}
                    </PendingButton>
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
            onClose={() => {
                if (!pending) {
                    onClose();
                }
            }}
            maxWidth="s"
            fullWidth
            hasCloseButton
            aria-label={t("password")}
        >
            <Dialog.Header
                caption={success ? t("passwordUpdated") : t("password")}
            />
            {body}
        </Dialog>
    );
}
