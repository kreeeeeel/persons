"use client";

import { useState } from "react";
import { Dialog, Flex, Text, TextArea } from "@gravity-ui/uikit";
import { FilePicker } from "@persons/person-domain/FilePicker";
import { useTranslate } from "@persons/i18n";
import { personClient } from "@persons/person-domain/api/browser";
import { usePersonMutation } from "@persons/person-domain/hooks/usePersonMutation";
import { MutationFeedback } from "@persons/person-domain/MutationFeedback";
import type { OwnershipDialogProps } from "@persons/person-domain/OwnershipDialog/OwnershipDialog.types";

const MAX_BYTES = 12 * 1024 * 1024;
const MIN_MESSAGE = 10;

export function OwnershipDialog({
    personId,
    onClose,
    onSaved,
}: OwnershipDialogProps) {
    const t = useTranslate("person");
    const [message, setMessage] = useState("");
    const [file, setFile] = useState<File>();
    const mutation = usePersonMutation();
    return (
        <Dialog
            open
            fullWidth
            maxWidth="m"
            contentOverflow="auto"
            onClose={() => {
                if (!mutation.pending) {
                    onClose();
                }
            }}
        >
            <Dialog.Header caption={t("claimPage")} />
            <Dialog.Body>
                <Flex direction="column" gap="4">
                    <MutationFeedback {...mutation} />
                    <Text>{t("claimInstructions")}</Text>
                    <TextArea
                        size="xl"
                        minRows={4}
                        value={message}
                        onUpdate={setMessage}
                        disabled={mutation.pending}
                        placeholder={t("claimMessage")}
                        controlProps={{
                            "aria-label": t("claimMessage"),
                            maxLength: 2000,
                        }}
                    />
                    <Text>{t("claimProof")}</Text>
                    <FilePicker
                        file={file}
                        accept="image/jpeg,image/png"
                        label={t("claimProof")}
                        disabled={mutation.pending}
                        onChange={setFile}
                    />
                    {file && file.size > MAX_BYTES && (
                        <Text color="danger">{t("MEDIA_TOO_LARGE")}</Text>
                    )}
                    <Text color="secondary">{t("claimPrivacy")}</Text>
                </Flex>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t("cancel")}
                onClickButtonCancel={onClose}
                textButtonApply={t("submitReview")}
                loading={mutation.pending}
                propsButtonApply={{
                    disabled:
                        message.trim().length < MIN_MESSAGE ||
                        !file ||
                        file.size > MAX_BYTES,
                }}
                onClickButtonApply={() => {
                    if (file) {
                        mutation.run(
                            () =>
                                personClient.claims.claimPerson({
                                    id: personId,
                                    message: message.trim(),
                                    file,
                                }),
                            onSaved,
                        );
                    }
                }}
            />
        </Dialog>
    );
}
