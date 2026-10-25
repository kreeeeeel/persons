"use client";

import { useCallback, useState } from "react";
import { Box, Button, Flex, Text } from "@gravity-ui/uikit";
import { CommentComposer } from "@persons/person-domain/CommentComposer";
import { EmptyIllustration } from "@persons/person-domain/EmptyIllustration";
import { useTranslate } from "@persons/i18n";
import { personClient } from "@persons/person-domain/api/browser";
import { useInfinitePersonData } from "@persons/person-domain/hooks/useInfinitePersonData";
import type { FeedSort } from "@persons/person-client";
import { FeedSortControl } from "@persons/person-domain/FeedSortControl";
import { CommentCard } from "@persons/person-domain/CommentCard";
import { FeedContent } from "@persons/person-domain/FeedContent";
import { InfiniteFeedLoader } from "@persons/person-domain/InfiniteFeedLoader";
import { usePersonMutation } from "@persons/person-domain/hooks/usePersonMutation";
import { MutationFeedback } from "@persons/person-domain/MutationFeedback";
import type { CommentsFeedProps } from "@persons/person-domain/CommentsFeed/CommentsFeed.types";
import styles from "@persons/person-domain/CommentsFeed/CommentsFeed.module.css";
import type { Comment } from "@persons/person-client";

const PAGE_SIZE = 10;

export function CommentsFeed({
    personId,
    signedIn,
    momentId,
    mediaId,
    publicUrl,
    showHeading,
    layout = "feed",
}: CommentsFeedProps) {
    const t = useTranslate("person");
    const [mine, setMine] = useState(false);
    const [editText, setEditText] = useState("");
    const [sort, setSort] = useState<FeedSort>("NEWEST");
    const [text, setText] = useState("");
    const [editing, setEditing] = useState<Comment>();
    const mutation = usePersonMutation();
    const load = useCallback(
        (page: number, signal: AbortSignal) =>
            personClient.interactions.listComments(
                {
                    id: personId,
                    momentId,
                    mediaId,
                    page,
                    size: PAGE_SIZE,
                    sort,
                    mine,
                },
                { signal },
            ),
        [personId, momentId, mediaId, sort, mine],
    );
    const resource = useInfinitePersonData(
        `comments:${personId}:${momentId}:${mediaId}:${sort}:${mine}`,
        load,
    );

    const composer = signedIn ? (
        <CommentComposer
            value={text}
            onChange={setText}
            pending={mutation.pending}
            media={layout === "media"}
            onSubmit={() =>
                mutation.run(
                    () =>
                        personClient.interactions.createComment({
                            id: personId,
                            commentInput: { text, momentId, mediaId },
                        }),
                    () => {
                        setText("");
                        resource.refresh();
                    },
                )
            }
        />
    ) : (
        <Text color="secondary">{t("signInHint")}</Text>
    );

    return (
        <Flex
            direction="column"
            gap={layout === "media" ? "0" : "4"}
            className={layout === "media" ? styles.media : undefined}
        >
            {showHeading && (
                <Flex
                    gap="3"
                    alignItems="center"
                    justifyContent="space-between"
                    className={styles.heading}
                >
                    <Text as="h2" variant="subheader-3">
                        {t("comments")} · {resource.data?.total ?? 0}
                    </Text>
                    <FeedSortControl
                        value={sort}
                        onChange={(next) => {
                            setSort(next);
                            setEditing(undefined);
                        }}
                        compact={layout === "media"}
                        mine={mine}
                        onMineChange={
                            signedIn
                                ? (next) => {
                                      setMine(next);
                                      setEditing(undefined);
                                  }
                                : undefined
                        }
                    />
                </Flex>
            )}
            <MutationFeedback {...mutation} />
            {layout !== "media" && !editing && composer}
            {!showHeading && (
                <Box className={styles.sort}>
                    <FeedSortControl
                        value={sort}
                        onChange={(next) => {
                            setSort(next);
                            setEditing(undefined);
                        }}
                        compact
                        mine={mine}
                        onMineChange={
                            signedIn
                                ? (next) => {
                                      setMine(next);
                                      setEditing(undefined);
                                  }
                                : undefined
                        }
                    />
                </Box>
            )}
            <Box className={layout === "media" ? styles.scroll : undefined}>
                <FeedContent
                    illustration="wall"
                    loading={resource.loading}
                    error={resource.error}
                    retainContentOnError={resource.data !== undefined}
                    empty={
                        !mediaId && !momentId && !resource.data?.items.length
                    }
                    emptyTitle={t("emptyWall")}
                    emptyDescription={t("emptyWallDescription")}
                    onRetry={resource.refresh}
                >
                    <Box className={styles.list}>
                        {resource.data?.items.map((item) => (
                            <CommentCard
                                key={item.id}
                                comment={item}
                                signedIn={signedIn}
                                publicUrl={publicUrl}
                                compact={layout === "media"}
                                className={styles.card}
                                pending={mutation.pending}
                                onEdit={
                                    item.canEdit
                                        ? () => {
                                              setEditing(item);
                                              setEditText(item.text);
                                          }
                                        : undefined
                                }
                                onRemove={
                                    item.canRemove
                                        ? () =>
                                              mutation.run(
                                                  () =>
                                                      personClient.interactions.deleteComment(
                                                          { id: item.id },
                                                      ),
                                                  resource.refresh,
                                              )
                                        : undefined
                                }
                                editor={
                                    editing?.id === item.id ? (
                                        <CommentComposer
                                            value={editText}
                                            onChange={setEditText}
                                            pending={mutation.pending}
                                            inputLabel={t("editComment")}
                                            submitLabel={t("saveChanges")}
                                            showSubmitLabel
                                            beforeSubmit={
                                                <Button
                                                    size="l"
                                                    view="flat"
                                                    disabled={mutation.pending}
                                                    onClick={() =>
                                                        setEditing(undefined)
                                                    }
                                                >
                                                    {t("cancel")}
                                                </Button>
                                            }
                                            onSubmit={() =>
                                                mutation.run(
                                                    () =>
                                                        personClient.interactions.editComment(
                                                            {
                                                                id: item.id,
                                                                commentInput: {
                                                                    text: editText,
                                                                },
                                                            },
                                                        ),
                                                    () => {
                                                        setEditing(undefined);
                                                        resource.refresh();
                                                    },
                                                )
                                            }
                                        />
                                    ) : undefined
                                }
                            />
                        ))}
                    </Box>
                </FeedContent>
                {!resource.loading &&
                    !resource.error &&
                    layout === "media" &&
                    !resource.data?.items.length && (
                        <Flex className={styles.empty}>
                            <Box className={styles.emptyArt}>
                                <EmptyIllustration kind="comments" />
                            </Box>
                            <Text color="secondary">
                                {t("emptyMediaComments")}
                            </Text>
                        </Flex>
                    )}
                <InfiniteFeedLoader {...resource} />
            </Box>
            {layout === "media" && !editing && (
                <Box className={styles.composer}>{composer}</Box>
            )}
        </Flex>
    );
}
