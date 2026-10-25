"use client";

import { Alert, Text } from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";

export function MutationFeedback({
    error,
    notice,
}: {
    readonly error?: string;
    readonly notice?: boolean;
    readonly published?: boolean;
}) {
    const t = useTranslate("person");

    return (
        <>
            {error && <Alert theme="danger" message={t(error)} />}
            {notice && (
                <Text color="secondary" role="status">
                    {t("pendingNotice")}
                </Text>
            )}
        </>
    );
}
