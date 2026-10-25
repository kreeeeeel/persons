"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Flex, Icon, TextInput } from "@gravity-ui/uikit";
import { Magnifier } from "@gravity-ui/icons";
import { useTranslate } from "@persons/i18n";
import { usePersonSearch } from "@persons/person-domain/hooks/usePersonSearch";
import { PersonSearchResults } from "@persons/person-domain/PersonSearchResults";
import type { PersonSearchProps } from "@persons/person-domain/PersonSearch/PersonSearch.types";
import styles from "@persons/person-domain/PersonSearch/PersonSearch.module.css";

const MAX_QUERY_LENGTH = 120;

export function PersonSearch({ variant = "hero" }: PersonSearchProps) {
    const t = useTranslate("person");
    const inputId = useId();
    const resultsId = `${inputId}-results`;
    const [value, setValue] = useState("");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const root = useRef<HTMLFormElement>(null);
    const router = useRouter();
    const search = usePersonSearch(value);
    const expanded = open && search.enabled;

    return (
        <Box
            as="form"
            ref={root}
            role="search"
            aria-label={t("searchLabel")}
            className={styles.root}
            data-variant={variant}
            onBlurCapture={(event) => {
                if (!root.current?.contains(event.relatedTarget)) {
                    setOpen(false);
                }
            }}
            onSubmit={(event) => {
                event.preventDefault();
                const selected = search.result?.items[active];

                if (expanded && selected) {
                    router.push(`/${selected.tag}`);
                    setOpen(false);
                    setValue("");
                }
            }}
        >
            <Flex
                as="label"
                htmlFor={inputId}
                alignItems="center"
                gap="2"
                className={styles.pill}
            >
                <Icon data={Magnifier} size={variant === "compact" ? 20 : 24} />
                <TextInput
                    id={inputId}
                    type="search"
                    size={variant === "compact" ? "l" : "xl"}
                    value={value}
                    onUpdate={(next) => {
                        setValue(next);
                        setActive(0);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    hasClear
                    autoComplete="off"
                    placeholder={t(
                        variant === "compact"
                            ? "searchCompactPlaceholder"
                            : "searchPlaceholder",
                    )}
                    view="clear"
                    controlProps={{
                        "aria-label": t("searchLabel"),
                        maxLength: MAX_QUERY_LENGTH,
                        role: "combobox",
                        "aria-autocomplete": "list",
                        "aria-expanded": expanded,
                        "aria-controls":
                            expanded && search.result?.items.length
                                ? resultsId
                                : undefined,
                        "aria-activedescendant":
                            expanded && search.result?.items[active]
                                ? `${resultsId}-${search.result.items[active].id}`
                                : undefined,
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            setOpen(false);
                        } else if (
                            event.key === "ArrowDown" ||
                            event.key === "ArrowUp"
                        ) {
                            event.preventDefault();
                            setOpen(true);
                            const total = search.result?.items.length ?? 0;

                            if (total > 0) {
                                setActive(
                                    (index) =>
                                        (index +
                                            (event.key === "ArrowDown"
                                                ? 1
                                                : total - 1)) %
                                        total,
                                );
                            }
                        }
                    }}
                    className={styles.input}
                />
            </Flex>
            {expanded && (
                <PersonSearchResults
                    id={resultsId}
                    compact={variant === "compact"}
                    loading={search.loading}
                    failed={search.failed}
                    result={search.result}
                    active={active}
                    onActive={setActive}
                    onRetry={search.retry}
                    onSelect={() => {
                        setOpen(false);
                        setValue("");
                    }}
                />
            )}
        </Box>
    );
}
