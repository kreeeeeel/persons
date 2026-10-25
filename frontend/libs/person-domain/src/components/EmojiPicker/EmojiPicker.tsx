"use client";

import { useRef, useState } from "react";
import { Box, Popup } from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";
import type { EmojiPickerProps } from "@persons/person-domain/EmojiPicker/EmojiPicker.types";
import styles from "@persons/person-domain/EmojiPicker/EmojiPicker.module.css";

export function EmojiPicker({
    value,
    emojis,
    disabled,
    onChange,
}: EmojiPickerProps) {
    const t = useTranslate("person");
    const anchor = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    return (
        <>
            <Box
                as="button"
                type="button"
                ref={anchor}
                className={styles.trigger}
                aria-label={t("ratingEmoji")}
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled}
                onClick={() => setOpen(!open)}
            >
                {value}
            </Box>
            <Popup
                open={open}
                onOpenChange={setOpen}
                anchorRef={anchor}
                placement="bottom-end"
                role="listbox"
                aria-label={t("ratingEmoji")}
            >
                <Box className={styles.palette}>
                    {emojis.map((emoji) => (
                        <Box
                            as="button"
                            type="button"
                            role="option"
                            key={emoji}
                            aria-label={emoji}
                            aria-selected={value === emoji}
                            className={styles.emoji}
                            onClick={() => {
                                onChange(emoji);
                                setOpen(false);
                            }}
                        >
                            {emoji}
                        </Box>
                    ))}
                </Box>
            </Popup>
        </>
    );
}
