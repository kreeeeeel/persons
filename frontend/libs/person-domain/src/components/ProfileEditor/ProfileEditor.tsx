"use client";

import { useId, useState, useTransition } from "react";
import { Alert, Dialog, Flex, Text, TextArea } from "@gravity-ui/uikit";
import { LabeledTextInput as TextInput } from "@persons/ui/LabeledTextInput";
import { useTranslate } from "@persons/i18n";
import type { ProfileInput, SocialNetwork } from "@persons/person-client";
import { personClient, personError } from "@persons/person-domain/api/browser";
import type { ProfileEditorProps } from "@persons/person-domain/ProfileEditor/ProfileEditor.types";
import dialogStyles from "@persons/person-domain/FormDialog/FormDialog.module.css";

const NETWORKS: readonly SocialNetwork[] = ["TELEGRAM", "STEAM", "DISCORD"];
const MAX_NAME_LENGTH = 10;
const MAX_DISCORD_TAG_LENGTH = 38;
const MAX_SEARCH_KEYWORDS = 20;
const MAX_SEARCH_KEYWORD_LENGTH = 80;
const MAX_SEARCH_KEYWORDS_INPUT_LENGTH =
    MAX_SEARCH_KEYWORDS * (MAX_SEARCH_KEYWORD_LENGTH + 2);

export function ProfileEditor({
    profile,
    ownRequest,
    administrator,
    onClose,
    onSaved,
}: ProfileEditorProps) {
    const t = useTranslate("person");
    const descriptionId = useId();
    const [draft, setDraft] = useState<ProfileInput>(() => ({
        tag: profile?.tag ?? "",
        firstName: profile?.firstName ?? "",
        lastName: profile?.lastName ?? "",
        patronymic: profile?.patronymic ?? "",
        description: profile?.description ?? "",
        tags: profile?.tags ?? [],
        searchKeywords: profile?.searchKeywords ?? [],
        socialLinks: profile?.socialLinks ?? [],
        ratingOptions: profile?.ratingOptions.map(({ emoji, label }) => ({
            emoji,
            label,
        })) ?? [
            { emoji: "💜", label: "💜" },
            { emoji: "🤝", label: "🤝" },
        ],
        version: profile?.version ?? 0,
    }));
    const [tags, setTags] = useState(draft.tags.join(", "));
    const [searchKeywords, setSearchKeywords] = useState(
        (draft.searchKeywords ?? []).join(", "),
    );
    const [error, setError] = useState<string>();
    const [pending, startTransition] = useTransition();

    function save() {
        setError(undefined);
        if (
            [draft.firstName, draft.lastName, draft.patronymic ?? ""].some(
                (name) => name.length > MAX_NAME_LENGTH,
            )
        ) {
            setError("INVALID_INPUT");
            return;
        }
        const keywords = searchKeywords
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
        if (
            keywords.length > MAX_SEARCH_KEYWORDS ||
            keywords.some((value) => value.length > MAX_SEARCH_KEYWORD_LENGTH)
        ) {
            setError("invalidSearchKeywords");
            return;
        }
        startTransition(async () => {
            const profileInput = {
                ...draft,
                tags: tags
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                searchKeywords: keywords,
                socialLinks: draft.socialLinks
                    .filter((link) => link.tag?.trim() || link.url?.trim())
                    .map((link) => ({
                        ...link,
                        ...(link.tag !== undefined
                            ? { tag: link.tag.trim() }
                            : { url: link.url?.trim() }),
                    })),
            };

            try {
                const receipt = profile
                    ? await personClient.persons.updatePerson({
                          id: profile.id,
                          profileInput,
                      })
                    : ownRequest
                      ? await personClient.persons.requestMyPerson({
                            profileInput,
                        })
                      : await personClient.persons.createPerson({
                            profileInput,
                        });

                onSaved(receipt, profileInput.tag);
            } catch (failure) {
                setError(await personError(failure));
            }
        });
    }

    return (
        <Dialog
            open
            onClose={() => {
                if (!pending) {
                    onClose();
                }
            }}
            modalClassName={dialogStyles.modal}
            fullWidth
            contentOverflow="auto"
        >
            <Dialog.Header
                caption={t(profile ? "editPerson" : "createPerson")}
            />
            <Dialog.Body className={dialogStyles.body}>
                <Flex
                    as="form"
                    id="profile-editor"
                    direction="column"
                    gap="4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        save();
                    }}
                >
                    {error && <Alert theme="danger" message={t(error)} />}
                    {!administrator && (
                        <Text color="secondary">{t("moderationHint")}</Text>
                    )}
                    <TextInput
                        size="xl"
                        label={t("tag")}
                        value={draft.tag}
                        onUpdate={(tag) => setDraft({ ...draft, tag })}
                        controlProps={{
                            "aria-label": t("tag"),
                            maxLength: 32,
                            required: true,
                            pattern: "[a-z][a-z0-9-]{1,31}",
                        }}
                        disabled={pending}
                    />
                    <Text color="secondary">{t("tagHint")}</Text>
                    {(["lastName", "firstName", "patronymic"] as const).map(
                        (field) => (
                            <TextInput
                                key={field}
                                size="xl"
                                label={t(field)}
                                value={draft[field] ?? ""}
                                onUpdate={(value) =>
                                    setDraft({ ...draft, [field]: value })
                                }
                                controlProps={{
                                    "aria-label": t(field),
                                    maxLength: MAX_NAME_LENGTH,
                                    required: field === "firstName",
                                }}
                                disabled={pending}
                            />
                        ),
                    )}
                    <Text as="label" htmlFor={descriptionId}>
                        {t("description")}
                    </Text>
                    <TextArea
                        id={descriptionId}
                        size="xl"
                        value={draft.description}
                        onUpdate={(description) =>
                            setDraft({ ...draft, description })
                        }
                        minRows={3}
                        disabled={pending}
                        controlProps={{
                            "aria-label": t("description"),
                            maxLength: 3000,
                        }}
                    />
                    <TextInput
                        size="xl"
                        label={t("tags")}
                        value={tags}
                        onUpdate={setTags}
                        disabled={pending}
                        controlProps={{
                            "aria-label": t("tags"),
                            maxLength: 500,
                        }}
                    />
                    <TextInput
                        size="xl"
                        label={t("searchKeywords")}
                        value={searchKeywords}
                        onUpdate={setSearchKeywords}
                        disabled={pending}
                        controlProps={{
                            "aria-label": t("searchKeywords"),
                            maxLength: MAX_SEARCH_KEYWORDS_INPUT_LENGTH,
                        }}
                    />
                    <Text color="secondary">{t("searchKeywordsHint")}</Text>
                    <Text variant="subheader-2">{t("socialLinks")}</Text>
                    {NETWORKS.map((network) => {
                        const social = draft.socialLinks.find(
                            (link) => link.network === network,
                        );
                        return (
                            <TextInput
                                key={network}
                                size="xl"
                                label={
                                    network === "DISCORD"
                                        ? t("discordTag")
                                        : network
                                }
                                value={social?.tag ?? social?.url ?? ""}
                                onUpdate={(value) =>
                                    setDraft({
                                        ...draft,
                                        socialLinks: [
                                            ...draft.socialLinks.filter(
                                                (link) =>
                                                    link.network !== network,
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
                                disabled={pending}
                                controlProps={{
                                    maxLength:
                                        network === "DISCORD"
                                            ? MAX_DISCORD_TAG_LENGTH
                                            : 300,
                                }}
                            />
                        );
                    })}
                </Flex>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t("cancel")}
                onClickButtonCancel={onClose}
                textButtonApply={t(administrator ? "saveDirect" : "save")}
                propsButtonApply={{ type: "submit", form: "profile-editor" }}
                loading={pending}
            />
        </Dialog>
    );
}
