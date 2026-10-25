"use client";

import { Flex, Label, Text } from "@gravity-ui/uikit";
import type { CreditEntry } from "@persons/person-client";
import { useTranslate } from "@persons/i18n";
import styles from "@persons/person-domain/CreditEntryContent/CreditEntryContent.module.css";

export function CreditEntryContent({ entry }: { readonly entry: CreditEntry }) {
    const t = useTranslate("person");
    const theme = ["TRUST", "ON_TIME"].includes(entry.kind)
        ? "success"
        : ["NOT_RETURNED", "DOUBT"].includes(entry.kind)
          ? "danger"
          : "warning";
    return (
        <Flex direction="column" alignItems="flex-start" gap="3">
            <Label theme={theme}>{t(entry.kind)}</Label>
            <Text className={styles.prose}>{entry.description}</Text>
        </Flex>
    );
}
