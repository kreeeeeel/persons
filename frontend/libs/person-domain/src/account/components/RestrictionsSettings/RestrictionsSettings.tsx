"use client";

import { Button, Flex, Label, Skeleton, Text } from "@gravity-ui/uikit";
import { useLocale, useTranslate } from "@persons/i18n";
import { LoadError } from "@persons/ui/loading/LoadError";
import { personClient } from "@persons/person-domain/api/browser";
import { usePersonData } from "@persons/person-domain/hooks/usePersonData";
import { EmptyState } from "@persons/person-domain/EmptyState";
import styles from "@persons/person-domain/account/components/RestrictionsSettings/RestrictionsSettings.module.css";

async function loadRestrictions(signal: AbortSignal) {
    const state = await personClient.restrictions.getAccessState({ signal });
    const restriction = state.restriction;

    return {
        ...state,
        restriction:
            restriction?.expiresAt &&
            restriction.expiresAt.getTime() <= Date.now()
                ? undefined
                : restriction,
    };
}

export function RestrictionsSettings() {
    const t = useTranslate("account");
    const person = useTranslate("person");
    const common = useTranslate("common");
    const locale = useLocale();
    const resource = usePersonData("account:restrictions", loadRestrictions);
    const restriction = resource.data?.restriction;
    const active = restriction && restriction.scopes.length > 0;
    const dates = new Intl.DateTimeFormat(locale, {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Moscow",
    });

    if (resource.loading) {
        return (
            <Flex
                direction="column"
                gap="3"
                role="status"
                aria-label={common("loading")}
            >
                <Skeleton size="l" />
                <Skeleton size="l" />
                <Skeleton size="l" />
            </Flex>
        );
    }

    if (resource.error) {
        return (
            <LoadError
                variant="dialog"
                title={common("loadingErrorTitle")}
                description={common("loadingErrorDescription")}
                retryLabel={common("retry")}
                onRetry={resource.refresh}
            />
        );
    }

    if (!resource.data?.signedIn) {
        return <Text color="secondary">{person("signInHint")}</Text>;
    }

    const refreshButton = (
        <Button
            size="l"
            view="normal"
            className={styles.refresh}
            loading={resource.refreshing}
            onClick={resource.refresh}
        >
            {t("refreshRestrictions")}
        </Button>
    );

    return (
        <Flex
            direction="column"
            gap="4"
            alignItems="flex-start"
            className={styles.root}
            data-empty={!active}
        >
            {active ? (
                <>
                    <Label theme="warning">{t("restrictionsActive")}</Label>
                    <Flex direction="column" gap="2">
                        {restriction.scopes.map((scope) => (
                            <Text key={scope}>
                                {person(`restriction${scope}`)}
                            </Text>
                        ))}
                    </Flex>
                    <Flex direction="column" gap="2">
                        <Text variant="subheader-2">
                            {t("restrictionReason")}
                        </Text>
                        <Text>{restriction.reason}</Text>
                    </Flex>
                    <Text color="secondary">
                        {restriction.expiresAt
                            ? person("restrictedUntil", {
                                  date: dates.format(restriction.expiresAt),
                              })
                            : person("restrictedForever")}
                    </Text>
                    {refreshButton}
                </>
            ) : (
                <EmptyState
                    illustration="restrictions"
                    description={t("noRestrictions")}
                    action={refreshButton}
                    compact
                />
            )}
        </Flex>
    );
}
