"use client";

import type { AccountActions } from "@persons/person-domain/account/AccountActionsContext";

import { LoadError } from "@persons/ui/loading/LoadError";
import { useState } from "react";
import { useLocale, useTranslate } from "@persons/i18n";
import { Box, Skeleton, Text } from "@gravity-ui/uikit";
import { useAccountResource } from "@persons/person-domain/account/hooks/useAccountResource";
import { SessionCard } from "@persons/person-domain/account/components/SessionCard/SessionCard";
import { EmptyState } from "@persons/person-domain/EmptyState";
import { SessionCardSkeleton } from "@persons/person-domain/account/components/SessionCardSkeleton/SessionCardSkeleton";
import { PendingButton } from "@persons/person-domain/account/components/PendingButton/PendingButton";
import type { SessionView } from "@persons/person-domain/account/model/SessionView";
import styles from "@persons/person-domain/account/components/SessionsSettings/SessionsSettings.module.css";

export function SessionsSettings({
    actions,
}: {
    readonly actions: Pick<
        AccountActions,
        "listAccountSessions" | "endAccountSession" | "endOtherAccountSessions"
    >;
}) {
    const { listAccountSessions, endAccountSession, endOtherAccountSessions } =
        actions;
    const t = useTranslate("account");
    const common = useTranslate("common");
    const locale = useLocale();
    const resource = useAccountResource(listAccountSessions);
    const sessions = resource.data;
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");

    async function end(session?: SessionView) {
        if (pending) {
            return;
        }
        setPending(true);
        setError("");
        const result = session
            ? await endAccountSession(session.id)
            : await endOtherAccountSessions();

        if (result.ok && result.data?.current) {
            window.location.assign(
                new URL(`/${locale}`, window.location.origin).href,
            );
            return;
        }
        if (result.ok) {
            resource.reload();
        } else {
            setError(result.code);
        }

        setPending(false);
    }

    const current = sessions?.find((session) => session.current);
    const others = sessions?.filter((session) => !session.current) ?? [];
    const failure = error || resource.error;

    return (
        <Box className={styles.body}>
            {failure && (
                <LoadError
                    variant="dialog"
                    title={common("loadingErrorTitle")}
                    description={t(failure)}
                    retryLabel={common("retry")}
                    onRetry={resource.reload}
                />
            )}
            {resource.loading ? (
                <Box
                    className={styles.stack}
                    role="status"
                    aria-label={common("loading")}
                >
                    <Skeleton className={styles.labelSkeleton} />
                    <SessionCardSkeleton />
                    <Skeleton className={styles.buttonSkeleton} />
                    <Skeleton className={styles.labelSkeleton} />
                    <SessionCardSkeleton />
                </Box>
            ) : (
                sessions && (
                    <>
                        <Text
                            as="h2"
                            variant="subheader-3"
                            className={styles.title}
                        >
                            {t("currentDevice")}
                        </Text>
                        {current && (
                            <SessionCard
                                session={current}
                                pending={pending}
                                onRevoke={() => void end(current)}
                            />
                        )}
                        <Box
                            as="form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void end();
                            }}
                        >
                            <PendingButton
                                pending={pending}
                                disabled={!others.length}
                            >
                                {t("endOthers")}
                            </PendingButton>
                        </Box>
                        <Text
                            as="h2"
                            variant="subheader-3"
                            className={styles.title}
                        >
                            {t("activeSessions")}
                        </Text>
                        {others.length ? (
                            others.map((session) => (
                                <SessionCard
                                    key={session.id}
                                    session={session}
                                    pending={pending}
                                    onRevoke={() => void end(session)}
                                />
                            ))
                        ) : (
                            <EmptyState
                                illustration="sessions"
                                description={t("noOtherSessions")}
                                compact
                            />
                        )}
                    </>
                )
            )}
        </Box>
    );
}
