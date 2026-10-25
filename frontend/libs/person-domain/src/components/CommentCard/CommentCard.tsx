"use client";

import { Flex, Label, Text } from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";
import { CommentAuthor } from "@persons/person-domain/CommentAuthor";
import { ContentTime } from "@persons/person-domain/ContentTime";
import { ContentActions } from "@persons/person-domain/ContentActions";
import { ContentLike } from "@persons/person-domain/ContentLike";
import type { CommentCardProps } from "@persons/person-domain/CommentCard/CommentCard.types";
import styles from "@persons/person-domain/CommentCard/CommentCard.module.css";

export function CommentCard({
    comment,
    signedIn,
    publicUrl,
    compact,
    className,
    pending,
    editor,
    onEdit,
    onRemove,
}: CommentCardProps) {
    const t = useTranslate("person");
    return (
        <Flex
            direction="column"
            gap="3"
            className={[
                styles.root,
                compact ? styles.compact : undefined,
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <Flex
                gap="3"
                alignItems="center"
                justifyContent="space-between"
                wrap
            >
                <CommentAuthor comment={comment} publicUrl={publicUrl} />
                <ContentTime date={comment.createdAt} />
            </Flex>
            {editor ?? (
                <>
                    {comment.moderationStatus === "PENDING" && (
                        <Label theme="warning">{t("pendingModeration")}</Label>
                    )}
                    <Text className={styles.prose}>{comment.text}</Text>
                    <ContentActions
                        pending={pending}
                        onEdit={onEdit}
                        onRemove={onRemove}
                    >
                        <ContentLike
                            key={`${comment.id}:${comment.likes}:${comment.likedByMe}:${comment.dislikes}:${comment.dislikedByMe}`}
                            kind="COMMENT"
                            id={comment.id}
                            likes={comment.likes}
                            liked={comment.likedByMe}
                            dislikes={comment.dislikes}
                            disliked={comment.dislikedByMe}
                            signedIn={signedIn}
                            disabled={comment.moderationStatus === "PENDING"}
                        />
                    </ContentActions>
                </>
            )}
        </Flex>
    );
}
