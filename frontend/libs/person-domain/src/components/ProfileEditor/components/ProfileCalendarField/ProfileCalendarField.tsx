"use client";

import { useId } from "react";
import { Box, Flex, Text } from "@gravity-ui/uikit";
import type { ProfileCalendarFieldProps } from "@persons/person-domain/ProfileEditor/components/ProfileCalendarField/ProfileCalendarField.types";
import styles from "@persons/person-domain/ProfileEditor/components/ProfileCalendarField/ProfileCalendarField.module.css";

export function ProfileCalendarField({
    label,
    value,
    disabled,
    onChange,
}: ProfileCalendarFieldProps) {
    const id = useId();
    return (
        <Flex direction="column" gap="2">
            <Text as="label" htmlFor={id}>
                {label}
            </Text>
            <Box
                as="input"
                id={id}
                type="date"
                className={styles.date}
                value={value?.toISOString().slice(0, 10) ?? ""}
                disabled={disabled}
                onChange={(event) => {
                    const target: unknown = event.target;
                    if (!(target instanceof HTMLInputElement)) {
                        return;
                    }
                    const next = target.value;
                    onChange(next ? new Date(`${next}T00:00:00Z`) : undefined);
                }}
            />
        </Flex>
    );
}
