"use client";

import { useState } from "react";
import { Alert, Dialog, Flex, Select, Text } from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";
import type { PersonProfile, Reputation } from "@persons/person-client";
import { personClient, personError } from "@persons/person-domain/api/browser";

const VALUES = ["UNKNOWN", "GOOD", "AVERAGE", "BAD"] as const;

export function ReputationOverrideDialog({
    profile,
    onClose,
    onSaved,
}: {
    readonly profile: Pick<
        PersonProfile,
        "id" | "fullName" | "reputationOverride"
    >;
    readonly onClose: () => void;
    readonly onSaved: () => void;
}) {
    const t = useTranslate("person");
    const [value, setValue] = useState<string>(
        profile.reputationOverride ?? "AUTO",
    );
    const [error, setError] = useState<string>();
    const [pending, setPending] = useState(false);
    async function save() {
        setPending(true);
        setError(undefined);
        try {
            await personClient.reputationAdmin.setReputationOverride({
                id: profile.id,
                reputationOverrideInput: {
                    reputation:
                        value === "AUTO" ? undefined : (value as Reputation),
                },
            });
            onSaved();
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
            <Dialog.Header caption={t("reputationOverride")} />
            <Dialog.Body>
                <Flex direction="column" gap="3">
                    {error && <Alert theme="danger" message={t(error)} />}
                    <Text>{profile.fullName}</Text>
                    <Select
                        size="xl"
                        width="max"
                        value={[value]}
                        onUpdate={([next]) => setValue(next)}
                        disabled={pending}
                        aria-label={t("reputationOverride")}
                        options={[
                            {
                                value: "AUTO",
                                content: t("automaticReputation"),
                            },
                            ...VALUES.map((reputation) => ({
                                value: reputation,
                                content: t(`reputation${reputation}`),
                            })),
                        ]}
                    />
                </Flex>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t("cancel")}
                onClickButtonCancel={onClose}
                textButtonApply={t("saveDirect")}
                onClickButtonApply={() => void save()}
                loading={pending}
            />
        </Dialog>
    );
}
