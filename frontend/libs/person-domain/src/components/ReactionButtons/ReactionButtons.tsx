"use client";

import { Box, Button, Icon, Text } from "@gravity-ui/uikit";
import { ThumbsDown, ThumbsUp } from "@gravity-ui/icons";
import type { MediaReaction } from "@persons/person-client";
import { useLocale, useTranslate } from "@persons/i18n";
import { compactCount } from "@persons/person-domain/format/compactCount";
import styles from "@persons/person-domain/ReactionButtons/ReactionButtons.module.css";

const REACTIONS = ["LIKE", "DISLIKE"] as const;

export function ReactionButtons({
    likes,
    dislikes,
    reaction,
    disabled,
    removalLabels = false,
    onReact,
}: {
    readonly likes: number;
    readonly dislikes: number;
    readonly reaction?: MediaReaction;
    readonly disabled?: boolean;
    readonly removalLabels?: boolean;
    readonly onReact: (reaction: MediaReaction) => void;
}) {
    const t = useTranslate("person");
    const locale = useLocale();
    return (
        <Box className={styles.pill}>
            {REACTIONS.map((value, index) => {
                const positive = value === "LIKE";
                const selected = reaction === value;
                const count = positive ? likes : dislikes;
                return (
                    <Box key={value} className={styles.section}>
                        {index > 0 && <Box className={styles.divider} />}
                        <Button
                            className={styles.vote}
                            size="l"
                            view="flat"
                            aria-label={t(
                                positive
                                    ? selected && removalLabels
                                        ? "unlike"
                                        : "like"
                                    : selected && removalLabels
                                      ? "removeDislike"
                                      : "dislike",
                            )}
                            selected={selected}
                            disabled={disabled}
                            onClick={() => onReact(value)}
                        >
                            <Icon
                                data={positive ? ThumbsUp : ThumbsDown}
                                size={20}
                            />
                        </Button>
                        <Text
                            className={styles.count}
                            aria-label={t(
                                positive ? "showLikes" : "showDislikes",
                                { count },
                            )}
                        >
                            {compactCount(count, locale)}
                        </Text>
                    </Box>
                );
            })}
        </Box>
    );
}
