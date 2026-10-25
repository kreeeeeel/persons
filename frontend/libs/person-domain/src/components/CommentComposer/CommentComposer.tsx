"use client";

import { useId } from "react";
import { Button, Flex, Icon, TextArea } from "@gravity-ui/uikit";
import { Check, PaperPlane } from "@gravity-ui/icons";
import { useTranslate } from "@persons/i18n";
import type { CommentComposerProps } from "@persons/person-domain/CommentComposer/CommentComposer.types";
import styles from "@persons/person-domain/CommentComposer/CommentComposer.module.css";

export function CommentComposer({
    value,
    onChange,
    onSubmit,
    pending,
    media,
    inputLabel,
    placeholder,
    maxLength = 2000,
    submitLabel,
    showSubmitLabel = false,
    submitDisabled = false,
    allowEmpty = false,
    footerStart,
    beforeSubmit,
}: CommentComposerProps) {
    const t = useTranslate("person");
    const inputId = useId();
    const toolbar = Boolean(footerStart || beforeSubmit);
    const canSubmit = (allowEmpty || Boolean(value.trim())) && !submitDisabled;
    return (
        <Flex
            as="form"
            direction="column"
            gap="3"
            className={media ? styles.media : undefined}
            onSubmit={(event) => {
                event.preventDefault();
                if (canSubmit && !pending) {
                    onSubmit();
                }
            }}
        >
            <Flex className={styles.field} direction="column" gap="3">
                <TextArea
                    id={inputId}
                    size="xl"
                    view="clear"
                    className={toolbar ? undefined : styles.input}
                    placeholder={placeholder ?? t("commentPlaceholder")}
                    value={value}
                    onUpdate={onChange}
                    minRows={media || toolbar ? 2 : 3}
                    maxRows={4}
                    disabled={pending}
                    controlProps={{
                        "aria-label":
                            inputLabel ?? t(media ? "yourComment" : "comment"),
                        maxLength,
                    }}
                />
                <Flex
                    gap="2"
                    alignItems="center"
                    justifyContent="space-between"
                    className={toolbar ? styles.toolbar : undefined}
                >
                    {footerStart}
                    <Flex
                        gap="2"
                        alignItems="center"
                        className={styles.actions}
                    >
                        {beforeSubmit}
                        <Button
                            className={
                                showSubmitLabel
                                    ? undefined
                                    : toolbar
                                      ? styles.toolbarSend
                                      : styles.send
                            }
                            size="l"
                            view="action"
                            type="submit"
                            aria-label={submitLabel ?? t("send")}
                            loading={pending}
                            disabled={!canSubmit}
                        >
                            <Icon
                                data={showSubmitLabel ? Check : PaperPlane}
                                size={20}
                            />
                            {showSubmitLabel && submitLabel}
                        </Button>
                    </Flex>
                </Flex>
            </Flex>
        </Flex>
    );
}
