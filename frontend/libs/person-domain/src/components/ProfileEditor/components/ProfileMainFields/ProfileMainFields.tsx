"use client";

import { Flex, Text } from "@gravity-ui/uikit";
import { LabeledTextInput } from "@persons/ui/LabeledTextInput";
import { useTranslate } from "@persons/i18n";
import type { ProfileEditorFieldsProps } from "@persons/person-domain/ProfileEditor/ProfileEditor.types";
import { ProfileCalendarField } from "@persons/person-domain/ProfileEditor/components/ProfileCalendarField/ProfileCalendarField";

export function ProfileMainFields({
    draft,
    disabled,
    onChange,
}: ProfileEditorFieldsProps) {
    const t = useTranslate("person");
    return (
        <Flex direction="column" gap="4">
            <LabeledTextInput
                size="xl"
                label={t("tag")}
                value={draft.tag}
                onUpdate={(tag) => onChange({ ...draft, tag })}
                disabled={disabled}
                controlProps={{
                    "aria-label": t("tag"),
                    maxLength: 32,
                    required: true,
                    pattern: "[a-z][a-z0-9-]{1,31}",
                }}
            />
            <Text color="secondary">{t("tagHint")}</Text>
            {(["lastName", "firstName", "patronymic"] as const).map((field) => (
                <LabeledTextInput
                    key={field}
                    size="xl"
                    label={t(field)}
                    value={draft[field] ?? ""}
                    onUpdate={(value) => onChange({ ...draft, [field]: value })}
                    disabled={disabled}
                    controlProps={{
                        "aria-label": t(field),
                        maxLength: 10,
                        required: field === "firstName",
                    }}
                />
            ))}
            <ProfileCalendarField
                label={t("birthDate")}
                value={draft.dates?.birthDate}
                disabled={disabled}
                onChange={(birthDate) =>
                    onChange({ ...draft, dates: { ...draft.dates, birthDate } })
                }
            />
        </Flex>
    );
}
