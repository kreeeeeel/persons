"use client";

import { useId, useRef } from "react";
import { Box, Button, Flex, Icon, Text } from "@gravity-ui/uikit";
import { Picture } from "@gravity-ui/icons";
import { useTranslate } from "@persons/i18n";
import type { FilePickerProps } from "@persons/person-domain/FilePicker/FilePicker.types";
import styles from "@persons/person-domain/FilePicker/FilePicker.module.css";

export function FilePicker({
    accept,
    label,
    file,
    disabled,
    onChange,
}: FilePickerProps) {
    const id = useId();
    const input = useRef<HTMLInputElement>(null);
    const t = useTranslate("person");
    return (
        <Flex gap="3" alignItems="center" wrap className={styles.picker}>
            <Box
                as="input"
                id={id}
                ref={input}
                type="file"
                accept={accept}
                disabled={disabled}
                className={styles.input}
                aria-label={label}
                onChange={() => onChange(input.current?.files?.[0])}
            />
            <Button
                size="l"
                view="normal"
                disabled={disabled}
                onClick={() => input.current?.click()}
            >
                <Icon data={Picture} size={20} />
                {t("chooseFile")}
            </Button>
            <Text color="secondary" className={styles.filename}>
                {file?.name ?? t("noFileSelected")}
            </Text>
        </Flex>
    );
}
