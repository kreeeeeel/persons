"use client";

import { useState } from "react";
import { Flex } from "@gravity-ui/uikit";
import type { MediaReaction } from "@persons/person-client";
import { personClient } from "@persons/person-domain/api/browser";
import { usePersonMutation } from "@persons/person-domain/hooks/usePersonMutation";
import { ReactionButtons } from "@persons/person-domain/ReactionButtons";
import { MutationFeedback } from "@persons/person-domain/MutationFeedback";
import type { MediaReactionsProps } from "@persons/person-domain/MediaReactions/MediaReactions.types";

export function MediaReactions({
    mediaId,
    initial,
    signedIn,
    disabled,
}: MediaReactionsProps) {
    const [state, setState] = useState(initial);
    const mutation = usePersonMutation();
    function react(reaction: MediaReaction) {
        mutation.run(
            async () =>
                setState(
                    state.reaction === reaction
                        ? await personClient.gallery.removeMediaReaction({
                              id: mediaId,
                          })
                        : await personClient.gallery.reactToMedia({
                              id: mediaId,
                              mediaReactionInput: { reaction },
                          }),
                ),
            undefined,
            false,
        );
    }
    return (
        <Flex direction="column" gap="3">
            <MutationFeedback {...mutation} />
            <ReactionButtons
                likes={state.likes}
                dislikes={state.dislikes}
                reaction={state.reaction}
                disabled={!signedIn || disabled || mutation.pending}
                onReact={react}
            />
        </Flex>
    );
}
