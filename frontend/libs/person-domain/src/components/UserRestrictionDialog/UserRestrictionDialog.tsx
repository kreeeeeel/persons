"use client";
import { LoadErrorContext } from "@persons/ui/loading/LoadErrorContext";
import dialogStyles from "@persons/person-domain/FormDialog/FormDialog.module.css";

import { useCallback, useId, useRef, useState } from "react";
import {
    Button,
    Box,
    Checkbox,
    Dialog,
    Flex,
    Select,
    Text,
    TextArea,
} from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";
import type {
    RestrictionInput,
    RestrictionScope,
} from "@persons/person-client";
import { personClient } from "@persons/person-domain/api/browser";
import { usePersonData } from "@persons/person-domain/hooks/usePersonData";
import { usePersonMutation } from "@persons/person-domain/hooks/usePersonMutation";
import { FeedContent } from "@persons/person-domain/FeedContent";
import { MutationFeedback } from "@persons/person-domain/MutationFeedback";
import type { UserRestrictionDialogProps } from "@persons/person-domain/UserRestrictionDialog/UserRestrictionDialog.types";
import styles from "@persons/person-domain/UserRestrictionDialog/UserRestrictionDialog.module.css";

const SCOPES: RestrictionScope[] = [
    "ACCOUNT",
    "COMMENTS",
    "RATINGS",
    "LOANS",
    "MEDIA",
    "PROFILE",
    "REACTIONS",
];
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

function localDate(date?: Date): string {
    return date
        ? new Date(date.getTime() - date.getTimezoneOffset() * MINUTE_MS)
              .toISOString()
              .slice(0, 16)
        : "";
}

export function UserRestrictionDialog({
    userId,
    name,
    onClose,
    onSaved,
}: UserRestrictionDialogProps) {
    const t = useTranslate("person");
    const reasonId = useId();
    const expiryId = useId();
    const expiryControl = useRef<HTMLInputElement>(null);
    const [openedAt] = useState(Date.now);
    const load = useCallback(
        (signal: AbortSignal) =>
            personClient.restrictions.getUserRestriction(
                { id: userId },
                { signal },
            ),
        [userId],
    );
    const resource = usePersonData(`restriction:${userId}`, load);
    const [draft, setDraft] = useState<RestrictionInput>();
    const mutation = usePersonMutation();
    const existing = resource.data?.restriction;
    const input: RestrictionInput = draft ?? {
        scopes: new Set(existing?.scopes ?? ["COMMENTS"]),
        reason: existing?.reason ?? "",
        expiresAt: existing?.expiresAt,
    };
    return (
        <Dialog
            open
            modalClassName={dialogStyles.modal}
            fullWidth
            contentOverflow="auto"
            hasCloseButton
            onClose={() => {
                if (!mutation.pending) {
                    onClose();
                }
            }}
            aria-label={t("manageRestrictions")}
        >
            <Dialog.Header caption={t("manageRestrictions")} />
            <Dialog.Body className={dialogStyles.body}>
                <LoadErrorContext value="dialog">
                    <Flex direction="column" gap="4">
                        <Text>{name}</Text>
                        <MutationFeedback {...mutation} />
                        <FeedContent
                            loading={resource.loading}
                            error={resource.error}
                            empty={false}
                            emptyTitle=""
                            emptyDescription=""
                            onRetry={resource.refresh}
                        >
                            <Flex direction="column" gap="4">
                                <Text>{t("restrictionActions")}</Text>
                                <Select
                                    size="l"
                                    multiple
                                    value={[...input.scopes]}
                                    disabled={mutation.pending}
                                    aria-label={t("restrictionActions")}
                                    options={SCOPES.map((value) => ({
                                        value,
                                        content: t(`scope${value}`),
                                    }))}
                                    onUpdate={(values) => {
                                        let scopes =
                                            values as RestrictionScope[];
                                        if (scopes.includes("ACCOUNT")) {
                                            scopes =
                                                input.scopes.has("ACCOUNT") &&
                                                scopes.length > 1
                                                    ? scopes.filter(
                                                          (x) =>
                                                              x !== "ACCOUNT",
                                                      )
                                                    : ["ACCOUNT"];
                                        }
                                        setDraft({
                                            ...input,
                                            scopes: new Set(scopes),
                                        });
                                    }}
                                />
                                <Text as="label" htmlFor={reasonId}>
                                    {t("restrictionReason")}
                                </Text>
                                <TextArea
                                    id={reasonId}
                                    size="l"
                                    minRows={3}
                                    value={input.reason}
                                    onUpdate={(reason) =>
                                        setDraft({ ...input, reason })
                                    }
                                    disabled={mutation.pending}
                                    controlProps={{ maxLength: 1000 }}
                                />
                                <Checkbox
                                    content={t("restrictedForever")}
                                    checked={!input.expiresAt}
                                    disabled={mutation.pending}
                                    onUpdate={(forever) =>
                                        setDraft({
                                            ...input,
                                            expiresAt: forever
                                                ? undefined
                                                : new Date(
                                                      Date.now() + ONE_DAY_MS,
                                                  ),
                                        })
                                    }
                                />
                                {input.expiresAt && (
                                    <Flex direction="column" gap="2">
                                        <Text as="label" htmlFor={expiryId}>
                                            {t("restrictionEnd")}
                                        </Text>
                                        <Box
                                            as="input"
                                            type="datetime-local"
                                            id={expiryId}
                                            ref={expiryControl}
                                            className={styles.dateControl}
                                            value={localDate(input.expiresAt)}
                                            disabled={mutation.pending}
                                            onChange={() => {
                                                const date = new Date(
                                                    expiryControl.current
                                                        ?.value ?? "",
                                                );
                                                if (
                                                    Number.isFinite(
                                                        date.getTime(),
                                                    )
                                                ) {
                                                    setDraft({
                                                        ...input,
                                                        expiresAt: date,
                                                    });
                                                }
                                            }}
                                        />
                                    </Flex>
                                )}
                                {existing && (
                                    <Button
                                        size="l"
                                        view="flat-danger"
                                        disabled={mutation.pending}
                                        onClick={() =>
                                            mutation.run(
                                                () =>
                                                    personClient.restrictions.revokeUserRestriction(
                                                        { id: userId },
                                                    ),
                                                onSaved,
                                                false,
                                            )
                                        }
                                    >
                                        {t("revokeRestriction")}
                                    </Button>
                                )}
                            </Flex>
                        </FeedContent>
                    </Flex>
                </LoadErrorContext>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t("cancel")}
                onClickButtonCancel={onClose}
                textButtonApply={t("saveDirect")}
                loading={mutation.pending}
                propsButtonApply={{
                    disabled:
                        resource.loading ||
                        !!resource.error ||
                        !input.scopes.size ||
                        input.reason.trim().length < 3 ||
                        (!!input.expiresAt &&
                            input.expiresAt.getTime() <= openedAt),
                }}
                onClickButtonApply={() =>
                    mutation.run(
                        () =>
                            personClient.restrictions.setUserRestriction({
                                id: userId,
                                restrictionInput: input,
                            }),
                        onSaved,
                        false,
                    )
                }
            />
        </Dialog>
    );
}
