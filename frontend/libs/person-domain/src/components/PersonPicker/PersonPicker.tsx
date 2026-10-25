"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Flex, Select, Skeleton, Text } from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";
import { personClient } from "@persons/person-domain/api/browser";
import { usePersonData } from "@persons/person-domain/hooks/usePersonData";
import type { PersonPickerProps } from "@persons/person-domain/PersonPicker/PersonPicker.types";
import { PersonIdentity } from "@persons/person-domain/PersonIdentity";
import { EmptyState } from "@persons/person-domain/EmptyState";

const DEBOUNCE_MS = 350;
const MIN_QUERY = 2;

export function PersonPicker({
    value,
    onChange,
    label,
    disabled,
    limit = 20,
}: PersonPickerProps) {
    const t = useTranslate("person");
    const [filter, setFilter] = useState("");
    const [query, setQuery] = useState("");
    useEffect(() => {
        const timer = setTimeout(() => setQuery(filter.trim()), DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [filter]);
    const load = useCallback(
        (signal: AbortSignal) =>
            query.length < MIN_QUERY
                ? Promise.resolve({ items: [], total: 0, page: 0, size: 20 })
                : personClient.persons.searchPersons(
                      { q: query, page: 0, size: 20 },
                      { signal },
                  ),
        [query],
    );
    const resource = usePersonData(`picker:${query}`, load);
    const people = new Map(
        [...value, ...(resource.data?.items ?? [])].map((person) => [
            person.id,
            person,
        ]),
    );
    return (
        <Flex direction="column" gap="2">
            <Text>{label || t("taggedPeople")}</Text>
            {resource.error && (
                <Alert theme="danger" message={t(resource.error)} />
            )}
            <Select
                size="xl"
                width="max"
                multiple
                filterable
                hasClear
                filter={filter}
                onFilterChange={setFilter}
                filterOption={() => true}
                getOptionHeight={() => 64}
                renderSelectedOption={(option) => (
                    <PersonIdentity
                        person={people.get(option.value)!}
                        size={24}
                    />
                )}
                value={value.map(({ id }) => id)}
                disabled={disabled}
                loading={resource.loading}
                aria-label={label || t("taggedPeople")}
                placeholder={t("selectPeople")}
                filterPlaceholder={t("searchPersons")}
                options={[...people.values()].map((person) => ({
                    value: person.id,
                    text: person.fullName,
                    content: <PersonIdentity person={person} size={44} />,
                    disabled:
                        value.length >= limit &&
                        !value.some(({ id }) => id === person.id),
                }))}
                onUpdate={(ids) =>
                    onChange(ids.slice(0, limit).map((id) => people.get(id)!))
                }
                renderEmptyOptions={() =>
                    resource.loading ? (
                        <Skeleton />
                    ) : (
                        <EmptyState
                            illustration="search"
                            description={t(
                                query.length < MIN_QUERY
                                    ? "typeTwoCharacters"
                                    : "noPersons",
                            )}
                            compact
                        />
                    )
                }
            />
        </Flex>
    );
}
