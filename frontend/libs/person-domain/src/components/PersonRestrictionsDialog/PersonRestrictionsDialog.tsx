"use client";

import { useCallback } from "react";
import { Button, Dialog, Flex } from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";
import { LoadErrorContext } from "@persons/ui/loading/LoadErrorContext";
import { personClient } from "@persons/person-domain/api/browser";
import { usePersonData } from "@persons/person-domain/hooks/usePersonData";
import { FeedContent } from "@persons/person-domain/FeedContent";
import { UserRestrictionDialog } from "@persons/person-domain/UserRestrictionDialog";
import { EmptyState } from "@persons/person-domain/EmptyState";
import type { PersonRestrictionsDialogProps } from "@persons/person-domain/PersonRestrictionsDialog/PersonRestrictionsDialog.types";
import dialogStyles from "@persons/person-domain/FormDialog/FormDialog.module.css";

export function PersonRestrictionsDialog({
    profile,
    onClose,
    onSaved,
    onLinkAccount,
}: PersonRestrictionsDialogProps) {
    const t = useTranslate("person");
    const load = useCallback(
        (signal: AbortSignal) =>
            personClient.admin.getAdminPerson({ id: profile.id }, { signal }),
        [profile.id],
    );
    const resource = usePersonData(`person-owner:${profile.id}`, load);

    if (resource.data?.ownerAccountId) {
        return (
            <UserRestrictionDialog
                userId={resource.data.ownerAccountId}
                name={t("personAccountOwner", { name: profile.fullName })}
                onClose={onClose}
                onSaved={onSaved}
            />
        );
    }

    return (
        <Dialog
            open
            hasCloseButton
            fullWidth
            modalClassName={dialogStyles.modal}
            onClose={onClose}
            aria-label={t("manageRestrictions")}
        >
            <Dialog.Header caption={t("manageRestrictions")} />
            <Dialog.Body className={dialogStyles.body}>
                <LoadErrorContext value="dialog">
                    <FeedContent
                        loading={resource.loading}
                        error={resource.error}
                        empty={false}
                        emptyTitle=""
                        emptyDescription=""
                        onRetry={resource.refresh}
                    >
                        <Flex
                            direction="column"
                            alignItems="flex-start"
                            gap="4"
                        >
                            <EmptyState
                                illustration="my-page"
                                description={t("noAccountForRestrictions")}
                                compact
                            />
                            <Button
                                view="action"
                                size="l"
                                onClick={onLinkAccount}
                            >
                                {t("owner")}
                            </Button>
                        </Flex>
                    </FeedContent>
                </LoadErrorContext>
            </Dialog.Body>
        </Dialog>
    );
}
