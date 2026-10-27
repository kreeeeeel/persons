"use client";

import { Flex } from "@gravity-ui/uikit";
import { LabeledTextInput } from "@persons/ui/LabeledTextInput";
import { useTranslate } from "@persons/i18n";
import type { ProfileEditorFieldsProps } from "@persons/person-domain/ProfileEditor/ProfileEditor.types";

export function ProfileSocialFields({
    draft,
    disabled,
    onChange,
}: ProfileEditorFieldsProps) {
    const t = useTranslate("person");
    return (
        <Flex direction="column" gap="4">
            {(["TELEGRAM", "STEAM", "DISCORD"] as const).map((network) => {
                const social = draft.socialLinks.find(
                    (link) => link.network === network,
                );
                return (
                    <LabeledTextInput
                        key={network}
                        size="xl"
                        label={
                            network === "DISCORD" ? t("discordTag") : network
                        }
                        value={social?.tag ?? social?.url ?? ""}
                        onUpdate={(value) =>
                            onChange({
                                ...draft,
                                socialLinks: [
                                    ...draft.socialLinks.filter(
                                        (link) => link.network !== network,
                                    ),
                                    network === "DISCORD"
                                        ? { network, tag: value }
                                        : { network, url: value },
                                ],
                            })
                        }
                        type={network === "DISCORD" ? "text" : "url"}
                        placeholder={
                            network === "TELEGRAM"
                                ? "https://t.me/…"
                                : network === "STEAM"
                                  ? "https://steamcommunity.com/…"
                                  : "username / name#1234"
                        }
                        disabled={disabled}
                        controlProps={{
                            maxLength: network === "DISCORD" ? 38 : 300,
                        }}
                    />
                );
            })}
        </Flex>
    );
}
