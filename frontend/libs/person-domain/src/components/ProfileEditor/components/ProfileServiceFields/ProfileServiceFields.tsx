"use client";

import { Flex, Select, Text } from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";
import type { PersonPresenceStatusEnum } from "@persons/person-client";
import type { ProfileEditorFieldsProps } from "@persons/person-domain/ProfileEditor/ProfileEditor.types";
import { ProfileCalendarField } from "@persons/person-domain/ProfileEditor/components/ProfileCalendarField/ProfileCalendarField";

export function ProfileServiceFields({
    draft,
    disabled,
    onChange,
    presence,
}: ProfileEditorFieldsProps & { readonly presence?: boolean }) {
    const t = useTranslate("person");
    if (presence) {
        return (
            <Flex direction="column" gap="4">
                <Text>{t("presenceHint")}</Text>
                <Select
                    size="xl"
                    width="max"
                    label={t("presenceStatus")}
                    aria-label={t("presenceStatus")}
                    value={[draft.presence?.status ?? "NONE"]}
                    options={[
                        { value: "NONE", content: t("presenceNone") },
                        { value: "MISSING", content: t("presenceMissing") },
                        {
                            value: "UNRESPONSIVE",
                            content: t("presenceUnresponsive"),
                        },
                    ]}
                    disabled={disabled}
                    onUpdate={([status]) =>
                        onChange({
                            ...draft,
                            presence:
                                status === "NONE"
                                    ? {}
                                    : {
                                          ...draft.presence,
                                          status: status as PersonPresenceStatusEnum,
                                      },
                        })
                    }
                />
                {draft.presence?.status && (
                    <ProfileCalendarField
                        label={t("presenceSince")}
                        value={draft.presence.since}
                        disabled={disabled}
                        onChange={(since) =>
                            onChange({
                                ...draft,
                                presence: { ...draft.presence, since },
                            })
                        }
                    />
                )}
            </Flex>
        );
    }
    return (
        <Flex direction="column" gap="4">
            {(["militaryDepartureDate", "militaryReturnDate"] as const).map(
                (field) => (
                    <ProfileCalendarField
                        key={field}
                        label={t(field)}
                        value={draft.dates?.[field]}
                        disabled={disabled}
                        onChange={(date) =>
                            onChange({
                                ...draft,
                                dates: { ...draft.dates, [field]: date },
                            })
                        }
                    />
                ),
            )}
        </Flex>
    );
}
