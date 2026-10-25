"use client";

import { useCallback, useState } from "react";
import { Flex, Label, Text } from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";
import { personClient } from "@persons/person-domain/api/browser";
import { useInfinitePersonData } from "@persons/person-domain/hooks/useInfinitePersonData";
import type { FeedSort } from "@persons/person-client";
import { FeedSortControl } from "@persons/person-domain/FeedSortControl";
import { ContentTime } from "@persons/person-domain/ContentTime";
import { ContentLike } from "@persons/person-domain/ContentLike";
import { RatingValue } from "@persons/person-domain/RatingValue";
import { FeedContent } from "@persons/person-domain/FeedContent";
import { InfiniteFeedLoader } from "@persons/person-domain/InfiniteFeedLoader";
import { CommentAuthor } from "@persons/person-domain/CommentAuthor";
import styles from "@persons/person-domain/RatingsFeed/RatingsFeed.module.css";

const PAGE_SIZE = 12;

export function RatingsFeed({
    personId,
    publicUrl,
    signedIn = false,
    revision = 0,
    hideOwn = false,
}: {
    readonly personId: string;
    readonly publicUrl?: string;
    readonly signedIn?: boolean;
    readonly revision?: number;
    readonly hideOwn?: boolean;
}) {
    const t = useTranslate("person");
    const [sort, setSort] = useState<FeedSort>("NEWEST");
    const load = useCallback(
        (page: number, signal: AbortSignal) =>
            personClient.interactions.listRatings(
                { id: personId, page, size: PAGE_SIZE, sort },
                { signal },
            ),
        [personId, sort],
    );
    const resource = useInfinitePersonData(
        `ratings:${personId}:${sort}`,
        load,
        revision,
    );
    const items = resource.data?.items.filter((item) => !hideOwn || !item.mine);
    return (
        <Flex direction="column" gap="4">
            <Text as="h2" variant="subheader-3">
                {t("peopleRatings")}
            </Text>
            <FeedSortControl value={sort} onChange={setSort} compact />
            <FeedContent
                loading={resource.loading}
                error={resource.error}
                retainContentOnError={resource.data !== undefined}
                empty={!items?.length}
                emptyTitle=""
                emptyDescription={t(
                    hideOwn ? "noOtherRatings" : "noPeopleRatings",
                )}
                illustration="ratings"
                onRetry={resource.refresh}
            >
                {items?.map((item) => (
                    <Flex
                        as="article"
                        key={item.id}
                        direction="column"
                        gap="3"
                        className={styles.row}
                    >
                        <Flex
                            alignItems="center"
                            justifyContent="space-between"
                            gap="3"
                            wrap
                        >
                            <CommentAuthor
                                publicUrl={publicUrl}
                                comment={{
                                    ...item,
                                    authorName:
                                        item.authorName || t("unknownAuthor"),
                                }}
                            />
                            <ContentTime date={item.createdAt} />
                        </Flex>
                        <Flex alignItems="center" gap="3">
                            <Text
                                className={styles.emoji}
                                aria-label={t("ratingValue", {
                                    value: item.value,
                                })}
                            >
                                {item.emoji.repeat(item.value)}
                            </Text>
                            <RatingValue value={item.value} precision={0} />
                        </Flex>
                        {item.comment && (
                            <Text className={styles.comment}>
                                {item.comment}
                            </Text>
                        )}
                        {item.commentStatus === "PENDING" && (
                            <Label theme="warning">{t("onModeration")}</Label>
                        )}
                        <ContentLike
                            key={`${item.id}:${item.likes}:${item.likedByMe}:${item.dislikes}:${item.dislikedByMe}`}
                            kind="RATING"
                            id={item.id}
                            likes={item.likes}
                            liked={item.likedByMe}
                            dislikes={item.dislikes}
                            disliked={item.dislikedByMe}
                            signedIn={signedIn}
                        />
                    </Flex>
                ))}
            </FeedContent>
            <InfiniteFeedLoader {...resource} />
        </Flex>
    );
}
