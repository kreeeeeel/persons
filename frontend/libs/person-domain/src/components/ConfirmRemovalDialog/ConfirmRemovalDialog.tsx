"use client";

import { Button, Dialog, Flex, Text } from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";
import type { ConfirmRemovalDialogProps } from "@persons/person-domain/ConfirmRemovalDialog/ConfirmRemovalDialog.types";

export function ConfirmRemovalDialog({
    onClose,
    onConfirm,
    pending = false,
    title,
    description,
    confirmLabel,
}: ConfirmRemovalDialogProps) {
    const t = useTranslate("person");
    const caption = title ?? t("confirmRemoval");
    return (
        <Dialog
            open
            maxWidth="s"
            hasCloseButton
            onClose={() => {
                if (!pending) {
                    onClose();
                }
            }}
            aria-label={caption}
        >
            <Dialog.Header caption={caption} />
            <Dialog.Body>
                <Text>{description ?? t("confirmRemovalDescription")}</Text>
            </Dialog.Body>
            <Dialog.Footer>
                <Flex gap="3" wrap>
                    <Button
                        size="l"
                        view="flat"
                        onClick={onClose}
                        disabled={pending}
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        size="l"
                        view="outlined-danger"
                        onClick={() => {
                            if (!pending) {
                                onConfirm();
                            }
                        }}
                        loading={pending}
                        disabled={pending}
                    >
                        {confirmLabel ?? t("remove")}
                    </Button>
                </Flex>
            </Dialog.Footer>
        </Dialog>
    );
}
