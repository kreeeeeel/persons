"use client";

import { useState } from "react";
import { Button, Dialog, Flex, Text } from "@gravity-ui/uikit";
import { useLocale, useTranslate } from "@persons/i18n";
import { AppLink } from "@persons/ui/AppLink";
import { LoadedAvatar } from "@persons/ui";
import { mediaHref } from "@persons/person-domain/api/browser";
import { compactPersonName } from "@persons/person-domain/format/compactPersonName";
import type { CommentAuthorProps } from "@persons/person-domain/CommentAuthor/CommentAuthor.types";
import dialogStyles from "@persons/person-domain/FormDialog/FormDialog.module.css";
import styles from "@persons/person-domain/CommentAuthor/CommentAuthor.module.css";

export function CommentAuthor({
    comment,
    publicUrl,
    description,
    interactive = false,
    prominent = false,
    compactName = false,
    metadata,
}: CommentAuthorProps) {
    const t = useTranslate("person");
    const locale = useLocale();
    const handle = comment.authorTag ?? comment.authorId;
    const [open, setOpen] = useState(false);
    const content = (
        <Flex alignItems="center" gap="3">
            <LoadedAvatar
                size={44}
                name={comment.authorName}
                src={
                    comment.authorAvatarUrl ??
                    (comment.authorAvatarMediaId
                        ? mediaHref(comment.authorAvatarMediaId)
                        : undefined)
                }
            />
            <Flex direction="column" gap="1">
                <Flex
                    alignItems="center"
                    gap="3"
                    wrap
                    className={styles.nameRow}
                >
                    <Text
                        title={comment.authorName}
                        variant="subheader-2"
                        className={prominent ? styles.prominent : undefined}
                    >
                        {compactName
                            ? compactPersonName(
                                  comment.authorName,
                                  "given-first",
                              )
                            : comment.authorName}
                    </Text>
                    {metadata}
                </Flex>
                {description}
            </Flex>
        </Flex>
    );
    if (!handle) {
        return interactive ? (
            <>
                <Button
                    view="flat"
                    className={styles.trigger}
                    aria-label={comment.authorName}
                    onClick={() => setOpen(true)}
                >
                    {content}
                </Button>
                {open && (
                    <Dialog
                        open
                        hasCloseButton
                        fullWidth
                        modalClassName={dialogStyles.modal}
                        onClose={() => setOpen(false)}
                    >
                        <Dialog.Header caption={comment.authorName} />
                        <Dialog.Body className={dialogStyles.body}>
                            <Flex direction="column" gap="4">
                                {content}
                                <Text color="secondary">
                                    {t("authorHasNoPage")}
                                </Text>
                            </Flex>
                        </Dialog.Body>
                    </Dialog>
                )}
            </>
        ) : (
            content
        );
    }
    const path = `/${locale}/publications/${encodeURIComponent(handle)}`;
    const href = publicUrl ? new URL(path, publicUrl).href : path;
    return (
        <AppLink
            href={href}
            view="primary"
            aria-label={comment.authorName}
            target={publicUrl ? "_blank" : undefined}
            rel={publicUrl ? "noopener noreferrer" : undefined}
        >
            {content}
        </AppLink>
    );
}
