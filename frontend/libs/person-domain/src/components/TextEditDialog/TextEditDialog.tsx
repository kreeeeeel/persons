"use client";

import { useState } from "react";
import { Dialog, Flex, TextArea } from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";
import { MutationFeedback } from "@persons/person-domain/MutationFeedback";
import { usePersonMutation } from "@persons/person-domain/hooks/usePersonMutation";
import type { TextEditDialogProps } from "@persons/person-domain/TextEditDialog/TextEditDialog.types";

export function TextEditDialog({
    title,
    initial,
    onSave,
    onClose,
    onSaved,
}: TextEditDialogProps) {
    const t = useTranslate("person");
    const common = useTranslate("common");
    const [text, setText] = useState(initial);
    const mutation = usePersonMutation();
    return (
        <Dialog
            open
            maxWidth="m"
            fullWidth
            contentOverflow="auto"
            onClose={() => {
                if (!mutation.pending) {
                    onClose();
                }
            }}
        >
            <Dialog.Header caption={title} />
            <Dialog.Body>
                <Flex direction="column" gap="4">
                    <MutationFeedback {...mutation} />
                    <TextArea
                        size="xl"
                        value={text}
                        onUpdate={setText}
                        minRows={4}
                        disabled={mutation.pending}
                        controlProps={{ "aria-label": title, maxLength: 2000 }}
                    />
                </Flex>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t("cancel")}
                onClickButtonCancel={onClose}
                textButtonApply={common("save")}
                loading={mutation.pending}
                propsButtonApply={{ disabled: !text.trim() }}
                onClickButtonApply={() =>
                    mutation.run(() => onSave(text.trim()), onSaved)
                }
            />
        </Dialog>
    );
}
