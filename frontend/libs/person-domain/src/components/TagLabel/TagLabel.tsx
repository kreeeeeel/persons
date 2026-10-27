"use client";

import { useContext } from "react";
import { Button, Flex, Popover, Skeleton, Text } from "@gravity-ui/uikit";
import { useLocale, useTranslate } from "@persons/i18n";
import { TagDictionaryContext } from "@persons/person-domain/tags/TagDictionaryContext";
import type { TagLabelProps } from "@persons/person-domain/TagLabel/TagLabel.types";
import styles from "@persons/person-domain/TagLabel/TagLabel.module.css";

export function TagLabel({ tag }: TagLabelProps) {
    const locale = useLocale();
    const t = useTranslate("person");
    const dictionary = useContext(TagDictionaryContext);
    const normalized = tag.replace(/^#/, "").toLocaleLowerCase();
    const definition = dictionary.definitions.find(
        (item) => item.tag.toLocaleLowerCase() === normalized,
    );
    const description =
        definition?.descriptions[locale] ??
        definition?.descriptions.ru ??
        definition?.descriptions.en;
    if (!description && !dictionary.loading && !dictionary.error) {
        return <Text className={styles.label}>{tag}</Text>;
    }
    return (
        <Popover
            trigger="all"
            placement="top"
            content={
                <Flex direction="column" gap="2" className={styles.popup}>
                    {dictionary.loading ? (
                        <Skeleton className={styles.skeleton} />
                    ) : dictionary.error ? (
                        <>
                            <Text>{t("dictionaryUnavailable")}</Text>
                            <Button view="flat" onClick={dictionary.refresh}>
                                {t("retry")}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Text variant="subheader-2">
                                #{definition?.tag}
                            </Text>
                            <Text>{description}</Text>
                        </>
                    )}
                </Flex>
            }
        >
            <Button
                view="flat"
                size="m"
                className={styles.button}
                aria-label={t("tagMeaning", { tag })}
            >
                {tag}
            </Button>
        </Popover>
    );
}
