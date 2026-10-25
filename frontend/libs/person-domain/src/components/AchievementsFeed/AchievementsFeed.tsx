"use client";

import { useCallback, useState } from "react";
import { Box, Flex, Skeleton, Text } from "@gravity-ui/uikit";
import type { PersonAchievement } from "@persons/person-client";
import { AchievementDialog } from "@persons/person-domain/AchievementDialog";
import { LoadedImage } from "@persons/ui";
import { useTranslate } from "@persons/i18n";
import { personClient } from "@persons/person-domain/api/browser";
import { useInfinitePersonData } from "@persons/person-domain/hooks/useInfinitePersonData";
import { usePersonMutation } from "@persons/person-domain/hooks/usePersonMutation";
import { FeedContent } from "@persons/person-domain/FeedContent";
import { InfiniteFeedLoader } from "@persons/person-domain/InfiniteFeedLoader";
import { MutationFeedback } from "@persons/person-domain/MutationFeedback";
import type { AchievementsFeedProps } from "@persons/person-domain/AchievementsFeed/AchievementsFeed.types";
import styles from "@persons/person-domain/AchievementsFeed/AchievementsFeed.module.css";

const PAGE_SIZE = 12;

export function AchievementsFeed({
    personId,
    canManage,
    revision = 0,
}: AchievementsFeedProps) {
    const t = useTranslate("person");
    const [selected, setSelected] = useState<PersonAchievement>();
    const load = useCallback(
        (page: number, signal: AbortSignal) =>
            personClient.achievements.listPersonAchievements(
                { id: personId, page, size: PAGE_SIZE },
                { signal },
            ),
        [personId],
    );
    const resource = useInfinitePersonData(
        `achievements:${personId}`,
        load,
        revision,
    );
    const mutation = usePersonMutation();
    return (
        <Flex direction="column" gap="4">
            <MutationFeedback {...mutation} />
            <FeedContent
                illustration="achievements"
                loading={resource.loading}
                skeleton={
                    <Box
                        className={styles.grid}
                        role="status"
                        aria-busy="true"
                        aria-label={t("loading")}
                    >
                        {[0, 1, 2, 3].map((key) => (
                            <Flex
                                key={key}
                                direction="column"
                                alignItems="center"
                                className={styles.card}
                                aria-hidden="true"
                            >
                                <Skeleton className={styles.imageSkeleton} />
                                <Skeleton className={styles.titleSkeleton} />
                            </Flex>
                        ))}
                    </Box>
                }
                error={resource.error}
                retainContentOnError={resource.data !== undefined}
                empty={!resource.data?.items.length}
                emptyTitle={t("emptyAchievements")}
                emptyDescription={t("emptyAchievementsDescription")}
                onRetry={resource.refresh}
            >
                <Box className={styles.grid}>
                    {resource.data?.items.map((item) => (
                        <Box
                            as="button"
                            type="button"
                            key={item.id}
                            className={styles.card}
                            onClick={() => setSelected(item)}
                        >
                            <LoadedImage
                                width={160}
                                height={160}
                                src={`/api/person/v1/achievements/${item.achievement.id}/image`}
                                alt=""
                            />
                            <Text as="span" variant="subheader-3">
                                {item.achievement.title}
                            </Text>
                        </Box>
                    ))}
                </Box>
            </FeedContent>
            <InfiniteFeedLoader {...resource} />
            {selected && (
                <AchievementDialog
                    item={selected}
                    canManage={canManage}
                    pending={mutation.pending}
                    onClose={() => setSelected(undefined)}
                    onRevoke={() =>
                        mutation.run(
                            () =>
                                personClient.achievements.revokeAchievement({
                                    id: selected.achievement.id,
                                    personId,
                                }),
                            () => {
                                setSelected(undefined);
                                resource.refresh();
                            },
                            false,
                        )
                    }
                />
            )}
        </Flex>
    );
}
