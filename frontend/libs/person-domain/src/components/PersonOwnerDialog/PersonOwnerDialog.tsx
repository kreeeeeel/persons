"use client";

import { useState, useTransition } from "react";
import { Alert, Dialog, Flex, Text } from "@gravity-ui/uikit";
import { LabeledTextInput as TextInput } from "@persons/ui/LabeledTextInput";
import { useTranslate } from "@persons/i18n";
import { personClient, personError } from "@persons/person-domain/api/browser";

export function PersonOwnerDialog({
    personId,
    onClose,
    onSaved,
}: {
    readonly personId: string;
    readonly onClose: () => void;
    readonly onSaved: () => void;
}) {
    const t = useTranslate("person");
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string>();
    const [pending, startTransition] = useTransition();

    return (
        <Dialog
            open
            aria-label={t("owner")}
            maxWidth="s"
            fullWidth
            contentOverflow="auto"
            onClose={() => {
                if (!pending) {
                    onClose();
                }
            }}
        >
            <Dialog.Header caption={t("owner")} />
            <Dialog.Body>
                <Flex
                    as="form"
                    id="owner-form"
                    direction="column"
                    gap="4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        setError(undefined);
                        startTransition(async () => {
                            try {
                                await personClient.admin.linkAccount({
                                    id: personId,
                                    ownerLinkInput: {
                                        email: email.trim() || undefined,
                                    },
                                });
                                onSaved();
                            } catch (failure) {
                                setError(await personError(failure));
                            }
                        });
                    }}
                >
                    {error && <Alert theme="danger" message={t(error)} />}
                    <Text>{t("ownerHint")}</Text>
                    <TextInput
                        size="xl"
                        type="email"
                        label={t("ownerEmail")}
                        value={email}
                        onUpdate={setEmail}
                        disabled={pending}
                        controlProps={{
                            "aria-label": t("ownerEmail"),
                            maxLength: 254,
                        }}
                    />
                </Flex>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t("cancel")}
                onClickButtonCancel={onClose}
                textButtonApply={t("saveDirect")}
                propsButtonApply={{ type: "submit", form: "owner-form" }}
                loading={pending}
            />
        </Dialog>
    );
}
