"use client";

import { Alert, Button, Flex, Text, TextArea } from "@gravity-ui/uikit";
import { LabeledTextInput } from "@persons/ui/LabeledTextInput";
import { LoadedAvatar } from "@persons/ui";
import { mediaHref } from "@persons/person-domain/api/browser";
import { MediaUploader } from "@persons/person-domain/MediaUploader";
import { PersonOwnerDialog } from "@persons/person-domain/PersonOwnerDialog";
import { AuthorIdentity } from "@persons/person-domain/AuthorIdentity";
import { PersonIdentity } from "@persons/person-domain/PersonIdentity";
import type { ProfileEditorProps } from "@persons/person-domain/ProfileEditor/ProfileEditor.types";
import { useProfileEditor } from "@persons/person-domain/hooks/useProfileEditor";
import { ProfileMainFields } from "@persons/person-domain/ProfileEditor/components/ProfileMainFields/ProfileMainFields";
import { ProfileServiceFields } from "@persons/person-domain/ProfileEditor/components/ProfileServiceFields/ProfileServiceFields";
import { ProfileSocialFields } from "@persons/person-domain/ProfileEditor/components/ProfileSocialFields/ProfileSocialFields";
import { ProfileEditorLayout } from "@persons/person-domain/ProfileEditor/components/ProfileEditorLayout/ProfileEditorLayout";

export function ProfileEditor(props: ProfileEditorProps) {
    const { administrator, onClose } = props;
    const {
        t,
        descriptionId,
        section,
        setSection,
        current,
        related,
        setRelated,
        draft,
        setDraft,
        tags,
        setTags,
        searchKeywords,
        setSearchKeywords,
        error,
        pending,
        save,
        relatedSaved,
        fields,
    } = useProfileEditor(props);
    return (
        <>
            <ProfileEditorLayout
                title={t(current ? "editPerson" : "createPerson")}
                identity={
                    <PersonIdentity
                        person={{
                            id: current?.id ?? "draft",
                            tag: draft.tag,
                            fullName:
                                [
                                    draft.lastName,
                                    draft.firstName,
                                    draft.patronymic,
                                ]
                                    .filter(Boolean)
                                    .join(" ") || t("createPerson"),
                            avatarMediaId: current?.avatarMediaId,
                        }}
                        showTag={Boolean(draft.tag)}
                    />
                }
                section={section}
                onSelect={setSection}
                pending={pending}
                administrator={administrator}
                onClose={onClose}
                onSave={() => save()}
            >
                {error && (
                    <Flex role="alert">
                        <Alert theme="danger" message={t(error)} />
                    </Flex>
                )}
                {!administrator && (
                    <Text color="secondary">{t("moderationHint")}</Text>
                )}
                {section === "main" && <ProfileMainFields {...fields} />}
                {section === "army" && <ProfileServiceFields {...fields} />}
                {section === "presence" && (
                    <ProfileServiceFields {...fields} presence />
                )}
                {section === "social" && <ProfileSocialFields {...fields} />}
                {section === "description" && (
                    <Flex direction="column" gap="4">
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
                            minRows={8}
                            disabled={pending}
                            controlProps={{
                                "aria-label": t("description"),
                                maxLength: 3000,
                            }}
                        />
                        <LabeledTextInput
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
                    </Flex>
                )}
                {section === "search" && (
                    <Flex direction="column" gap="3">
                        <LabeledTextInput
                            size="xl"
                            label={t("searchKeywords")}
                            value={searchKeywords}
                            onUpdate={setSearchKeywords}
                            disabled={pending}
                            controlProps={{
                                "aria-label": t("searchKeywords"),
                                maxLength: 1640,
                            }}
                        />
                        <Text color="secondary">{t("searchKeywordsHint")}</Text>
                    </Flex>
                )}
                {section === "avatar" && (
                    <Flex direction="column" gap="4" alignItems="flex-start">
                        <LoadedAvatar
                            size={96}
                            name={draft.firstName}
                            src={
                                current?.avatarMediaId
                                    ? mediaHref(current.avatarMediaId)
                                    : undefined
                            }
                        />
                        <Button
                            size="l"
                            view="outlined"
                            disabled={pending}
                            onClick={() =>
                                current ? setRelated("avatar") : save("avatar")
                            }
                        >
                            {t(
                                current
                                    ? "changeAvatar"
                                    : "saveAndChooseAvatar",
                            )}
                        </Button>
                    </Flex>
                )}
                {section === "account" && (
                    <Flex direction="column" gap="4">
                        {current?.linkedAccount && (
                            <AuthorIdentity
                                author={current.linkedAccount}
                                description={t("linkedProfile")}
                            />
                        )}
                        <Text color="secondary">
                            {t(
                                administrator
                                    ? "ownerHint"
                                    : "ownAccountLinkHint",
                            )}
                        </Text>
                        {administrator && (
                            <Button
                                size="l"
                                view="outlined"
                                disabled={pending}
                                onClick={() =>
                                    current
                                        ? setRelated("account")
                                        : save("account")
                                }
                            >
                                {t(current ? "owner" : "saveAndLinkAccount")}
                            </Button>
                        )}
                    </Flex>
                )}
            </ProfileEditorLayout>
            {related === "avatar" && current && (
                <MediaUploader
                    personId={current.id}
                    kind="AVATAR"
                    onClose={() => setRelated(undefined)}
                    onSaved={relatedSaved}
                />
            )}
            {related === "account" && current && (
                <PersonOwnerDialog
                    personId={current.id}
                    onClose={() => setRelated(undefined)}
                    onSaved={relatedSaved}
                />
            )}
        </>
    );
}
