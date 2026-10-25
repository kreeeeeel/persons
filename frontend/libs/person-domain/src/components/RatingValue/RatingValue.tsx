"use client";

import { Text } from "@gravity-ui/uikit";
import type { RatingValueProps } from "@persons/person-domain/RatingValue/RatingValue.types";
import styles from "@persons/person-domain/RatingValue/RatingValue.module.css";

function tone(value: number): string {
    if (value < 2) {
        return "bad";
    }
    if (value < 3) {
        return "poor";
    }
    if (value < 4) {
        return "average";
    }
    if (value < 4.5) {
        return "good";
    }
    return "great";
}

export function RatingValue({
    value,
    count,
    precision = 1,
    className = "",
}: RatingValueProps) {
    const empty = count === 0;
    return (
        <Text
            className={`${styles.value} ${className}`}
            data-tone={empty ? "empty" : tone(value)}
        >
            {empty ? "—" : `${value.toFixed(precision)} / 5`}
        </Text>
    );
}
