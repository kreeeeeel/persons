"use client";

import { useId, useState, useTransition } from "react";
import { useTranslate } from "@persons/i18n";
import type {
    ModerationReceipt,
    PersonProfile,
    ProfileInput,
} from "@persons/person-client";
import { personClient, personError } from "@persons/person-domain/api/browser";
import type {
    ProfileEditorProps,
    ProfileEditorSection,
} from "@persons/person-domain/ProfileEditor/ProfileEditor.types";

type RelatedSection = "avatar" | "account";

export function useProfileEditor({
    profile,
    ownRequest,
    onSaved,
}: ProfileEditorProps) {
    const t = useTranslate("person");
    const descriptionId = useId();
    const [section, setSection] = useState<ProfileEditorSection>("main");
    const [entity, setEntity] = useState<PersonProfile>();
    const current = entity ?? profile;
    const [related, setRelated] = useState<RelatedSection>();
    const [createdReceipt, setCreatedReceipt] = useState<ModerationReceipt>();
    const [draft, setDraft] = useState<ProfileInput>(() => ({
        tag: profile?.tag ?? "",
        firstName: profile?.firstName ?? "",
        lastName: profile?.lastName ?? "",
        patronymic: profile?.patronymic ?? "",
        description: profile?.description ?? "",
        dates: profile?.dates ?? {},
        presence: profile?.presence ?? {},
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

    function invalid(target: ProfileEditorSection, message = "INVALID_INPUT") {
        setSection(target);
        setError(message);
    }

    function save(next?: RelatedSection) {
        setError(undefined);
        if (
            !/^[a-z][a-z0-9-]{1,31}$/.test(draft.tag) ||
            !draft.firstName.trim() ||
            [draft.firstName, draft.lastName, draft.patronymic ?? ""].some(
                (name) => name.length > 10,
            )
        ) {
            invalid("main");
            return;
        }
        const labels = tags
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
        if (
            labels.length > 12 ||
            labels.some((tag) => tag.length > 32) ||
            new Set(labels.map((tag) => tag.toLowerCase())).size !==
                labels.length ||
            draft.description.length > 3000
        ) {
            invalid("description");
            return;
        }
        const keywords = searchKeywords
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
        if (
            keywords.length > 20 ||
            keywords.some((value) => value.length > 80)
        ) {
            invalid("search", "invalidSearchKeywords");
            return;
        }
        const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Europe/Moscow",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format();
        const birth = draft.dates?.birthDate;
        const departure = draft.dates?.militaryDepartureDate;
        const returning = draft.dates?.militaryReturnDate;
        if (birth && birth.toISOString().slice(0, 10) > today) {
            invalid("main");
            return;
        }
        if (
            (birth && departure && departure <= birth) ||
            (returning && (!departure || returning <= departure))
        ) {
            invalid("army");
            return;
        }
        if (
            draft.presence?.status &&
            (!draft.presence.since ||
                draft.presence.since.toISOString().slice(0, 10) > today)
        ) {
            invalid("presence");
            return;
        }
        startTransition(async () => {
            const profileInput = {
                ...draft,
                tags: labels,
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
                const receipt = current
                    ? await personClient.persons.updatePerson({
                          id: current.id,
                          profileInput,
                      })
                    : ownRequest
                      ? await personClient.persons.requestMyPerson({
                            profileInput,
                        })
                      : await personClient.persons.createPerson({
                            profileInput,
                        });
                if (next && receipt.personId) {
                    const saved = await personClient.persons.getPerson({
                        tag: profileInput.tag,
                    });
                    setEntity(saved);
                    setDraft((value) => ({ ...value, version: saved.version }));
                    setCreatedReceipt(receipt);
                    setRelated(next);
                    return;
                }
                onSaved(receipt, profileInput.tag);
            } catch (failure) {
                setError(await personError(failure));
            }
        });
    }

    async function relatedSaved() {
        setRelated(undefined);
        if (createdReceipt) {
            onSaved(createdReceipt, draft.tag);
            return;
        }
        if (current) {
            try {
                const saved = await personClient.persons.getPerson({
                    tag: current.tag,
                });
                setEntity(saved);
                setDraft((value) => ({ ...value, version: saved.version }));
            } catch (failure) {
                setError(await personError(failure));
            }
        }
    }

    const fields = { draft, disabled: pending, onChange: setDraft };
    return {
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
    };
}
