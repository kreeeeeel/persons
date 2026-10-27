"use client";

import { Flex, Label } from "@gravity-ui/uikit";
import type { CreditEntry } from "@persons/person-client";
import { useTranslate } from "@persons/i18n";
import { ContentTime } from "@persons/person-domain/ContentTime";
import { ContentText } from "@persons/person-domain/ContentText";
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
            <Flex
                alignItems="center"
                justifyContent="space-between"
                gap="3"
                wrap
                className={styles.header}
            >
                <Label theme={theme}>{t(entry.kind)}</Label>
                <ContentTime date={entry.createdAt} />
            </Flex>
            <ContentText className={styles.prose} text={entry.description} />
        </Flex>
    );
}
