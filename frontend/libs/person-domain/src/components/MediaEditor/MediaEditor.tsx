"use client";

import { useState } from "react";
import { Dialog, Flex, TextInput } from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";
import { personClient } from "@persons/person-domain/api/browser";
import { PersonPicker } from "@persons/person-domain/PersonPicker";
import dialogStyles from "@persons/person-domain/FormDialog/FormDialog.module.css";
import { MutationFeedback } from "@persons/person-domain/MutationFeedback";
import { usePersonMutation } from "@persons/person-domain/hooks/usePersonMutation";
import type { MediaEditorProps } from "@persons/person-domain/MediaEditor/MediaEditor.types";

export function MediaEditor({ detail, onClose, onSaved }: MediaEditorProps) {
    const t = useTranslate("person");
    const common = useTranslate("common");
    const [caption, setCaption] = useState(detail.caption);
    const [people, setPeople] = useState(detail.taggedPersons);
    const mutation = usePersonMutation();
    return (
        <Dialog
            open
            modalClassName={dialogStyles.modal}
            fullWidth
            contentOverflow="auto"
            onClose={() => {
                if (!mutation.pending) {
                    onClose();
                }
            }}
        >
            <Dialog.Header caption={t("editMedia")} />
            <Dialog.Body className={dialogStyles.body}>
                <Flex direction="column" gap="4">
                    <MutationFeedback {...mutation} />
                    <TextInput
                        size="xl"
                        value={caption}
                        onUpdate={setCaption}
                        disabled={mutation.pending}
                        controlProps={{
                            "aria-label": t("caption"),
                            maxLength: 200,
                        }}
                        placeholder={t("caption")}
                    />
                    <PersonPicker
                        value={people}
                        onChange={setPeople}
                        disabled={mutation.pending}
                    />
                </Flex>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t("cancel")}
                onClickButtonCancel={onClose}
                textButtonApply={common("save")}
                loading={mutation.pending}
                onClickButtonApply={() =>
                    mutation.run(
                        () =>
                            personClient.gallery.editMedia({
                                id: detail.id,
                                mediaEditInput: {
                                    caption,
                                    taggedPersonIds: people.map(({ id }) => id),
                                },
                            }),
                        onSaved,
                    )
                }
            />
        </Dialog>
    );
}
