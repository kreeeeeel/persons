"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Flex, Text, TextInput } from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";
import { useAccountActions } from "@persons/person-domain/account/AccountActionsContext";
import { notifyAccountProfileChanged } from "@persons/person-domain/account/profileChanges";
import type { SettingsCenterProps } from "@persons/person-domain/account/components/SettingsCenter/SettingsCenter.types";
import styles from "@persons/person-domain/account/components/ProfileSettings/ProfileSettings.module.css";

const MAX_NAME_LENGTH = 10;

export function ProfileSettings({ user }: Pick<SettingsCenterProps, "user">) {
    const t = useTranslate("account");
    const common = useTranslate("common");
    const actions = useAccountActions();
    const router = useRouter();
    const [value, setValue] = useState({
        firstName: user.firstName,
        lastName: user.lastName,
        patronymic: user.patronymic ?? "",
    });
    const [pending, setPending] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(false);
    const invalid =
        !value.firstName.trim() ||
        !value.lastName.trim() ||
        Object.values(value).some((name) => name.length > MAX_NAME_LENGTH);

    async function save() {
        if (pending || invalid) {
            return;
        }
        setPending(true);
        setError(false);
        setSaved(false);
        try {
            const result = await actions.changeProfile(value);
            if (result.ok) {
                setSaved(true);
                notifyAccountProfileChanged();
                router.refresh();
            } else {
                setError(true);
            }
        } catch {
            setError(true);
        } finally {
            setPending(false);
        }
    }

    return (
        <Flex direction="column" gap="6">
            <Box
                as="form"
                className={styles.form}
                onSubmit={(event) => {
                    event.preventDefault();
                    void save();
                }}
            >
                {(["lastName", "firstName", "patronymic"] as const).map(
                    (field) => (
                        <Flex key={field} direction="column" gap="2">
                            <Text as="label" htmlFor={`settings-${field}`}>
                                {t(field)}
                            </Text>
                            <TextInput
                                id={`settings-${field}`}
                                size="l"
                                value={value[field]}
                                disabled={pending}
                                autoComplete={
                                    field === "firstName"
                                        ? "given-name"
                                        : field === "lastName"
                                          ? "family-name"
                                          : "additional-name"
                                }
                                controlProps={{
                                    maxLength: MAX_NAME_LENGTH,
                                    required: field !== "patronymic",
                                }}
                                onUpdate={(next) => {
                                    setValue({ ...value, [field]: next });
                                    setSaved(false);
                                }}
                            />
                        </Flex>
                    ),
                )}
                {error && (
                    <Alert theme="danger" message={t("profileSaveError")} />
                )}
                <Flex alignItems="center" gap="3" wrap="wrap">
                    <Button
                        type="submit"
                        size="l"
                        view="action"
                        loading={pending}
                        disabled={invalid}
                    >
                        {common("save")}
                    </Button>
                    {saved && (
                        <Text role="status" color="positive">
                            {t("profileSaved")}
                        </Text>
                    )}
                </Flex>
            </Box>
        </Flex>
    );
}
