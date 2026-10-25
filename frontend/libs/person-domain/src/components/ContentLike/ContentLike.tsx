"use client";

import { useState } from "react";
import { Flex } from "@gravity-ui/uikit";
import type { LikeState, MediaReaction } from "@persons/person-client";
import { personClient } from "@persons/person-domain/api/browser";
import { usePersonMutation } from "@persons/person-domain/hooks/usePersonMutation";
import { ReactionButtons } from "@persons/person-domain/ReactionButtons";
import { MutationFeedback } from "@persons/person-domain/MutationFeedback";
import type { ContentLikeProps } from "@persons/person-domain/ContentLike/ContentLike.types";
import styles from "@persons/person-domain/ContentLike/ContentLike.module.css";

export function ContentLike({
    kind,
    id,
    likes = 0,
    liked = false,
    dislikes = 0,
    disliked = false,
    signedIn,
    disabled,
}: ContentLikeProps) {
    const [state, setState] = useState<LikeState>({
        count: likes,
        liked,
        dislikes,
        disliked,
    });
    const mutation = usePersonMutation();
    function react(reaction: MediaReaction) {
        const selected = reaction === "LIKE" ? state.liked : state.disliked;
        mutation.run(
            async () =>
                setState(
                    selected
                        ? await personClient.engagement.clearContentReaction({
                              kind,
                              id,
                          })
                        : await personClient.engagement.reactToContent({
                              kind,
                              id,
                              contentReactionInput: { reaction },
                          }),
                ),
            undefined,
            false,
        );
    }
    return (
        <Flex direction="column" gap="2" className={styles.root}>
            <ReactionButtons
                likes={state.count}
                dislikes={state.dislikes ?? 0}
                reaction={
                    state.liked
                        ? "LIKE"
                        : state.disliked
                          ? "DISLIKE"
                          : undefined
                }
                removalLabels
                disabled={!signedIn || disabled || mutation.pending}
                onReact={react}
            />
            <MutationFeedback {...mutation} />
        </Flex>
    );
}
