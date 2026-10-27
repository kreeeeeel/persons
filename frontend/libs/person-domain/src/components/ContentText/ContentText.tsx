"use client";

import { Text } from "@gravity-ui/uikit";
import { TagLabel } from "@persons/person-domain/TagLabel";
import type { ContentTextProps } from "@persons/person-domain/ContentText/ContentText.types";
import styles from "@persons/person-domain/ContentText/ContentText.module.css";

export function ContentText({ text, className }: ContentTextProps) {
    const parts = text.split(/(#[\p{L}\p{N}_-]+)/u);
    return (
        <Text
            as="p"
            className={[styles.prose, className].filter(Boolean).join(" ")}
        >
            {parts.map((part, index) =>
                part.startsWith("#") && part.length <= 33 ? (
                    <TagLabel key={index} tag={part} />
                ) : (
                    part
                ),
            )}
        </Text>
    );
}
