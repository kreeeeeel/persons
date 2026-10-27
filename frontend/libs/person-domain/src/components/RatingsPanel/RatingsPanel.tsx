"use client";

import { ContentText } from "@persons/person-domain/ContentText";

import { useState } from "react";
import { Box, Button, Flex, Icon, Label, Text } from "@gravity-ui/uikit";
import { Pencil, TrashBin } from "@gravity-ui/icons";
import { CommentComposer } from "@persons/person-domain/CommentComposer";
import { useTranslate } from "@persons/i18n";
import type { RatingState } from "@persons/person-client";
import { personClient } from "@persons/person-domain/api/browser";
import { MutationFeedback } from "@persons/person-domain/MutationFeedback";
import { EmojiPicker } from "@persons/person-domain/EmojiPicker";
import { RatingsFeed } from "@persons/person-domain/RatingsFeed";
import { ConfirmRemovalDialog } from "@persons/person-domain/ConfirmRemovalDialog";
import { usePersonMutation } from "@persons/person-domain/hooks/usePersonMutation";
import type { RatingsPanelProps } from "@persons/person-domain/RatingsPanel/RatingsPanel.types";
import styles from "@persons/person-domain/RatingsPanel/RatingsPanel.module.css";

const SCORES = [1, 2, 3, 4, 5] as const;

export function RatingsPanel({
    personId,
    signedIn,
    initialOptions,
    onChange,
    initialRating,
    publicUrl,
}: RatingsPanelProps) {
    const t = useTranslate("person");
    const [rating, setRating] = useState<RatingState>(
        initialRating ?? { options: initialOptions },
    );
    const [comment, setComment] = useState(initialRating?.comment ?? "");
    const [score, setScore] = useState(initialRating?.value ?? 0);
    const [emoji, setEmoji] = useState(
        initialRating?.emoji || initialOptions[0]?.emoji || "⭐",
    );
    const [editing, setEditing] = useState(false);
    const [confirmingRemoval, setConfirmingRemoval] = useState(false);
    const [hovered, setHovered] = useState(0);
    const [revision, setRevision] = useState(0);
    const mutation = usePersonMutation();
    const emojis = [
        ...new Set([
            ...rating.options.map((item) => item.emoji),
            ...(rating.availableEmojis ?? []),
        ]),
    ];
    const savedEmoji =
        rating.emoji ||
        rating.options.find((option) => option.id === rating.optionId)?.emoji ||
        "⭐";

    function changed() {
        setRevision((value) => value + 1);
        onChange();
    }

    function save() {
        const option = rating.options.find((item) => item.emoji === emoji);
        mutation.run(
            () =>
                personClient.interactions.ratePerson({
                    id: personId,
                    ratingInput: {
                        ...(option ? { optionId: option.id } : { emoji }),
                        value: score,
                        comment: comment.trim(),
                    },
                }),
            (next) => {
                setRating({ ...next, emoji: next.emoji ?? emoji });
                setEditing(false);
                changed();
            },
            false,
        );
    }

    function edit() {
        setComment(rating.comment ?? "");
        setScore(rating.value ?? 0);
        setEmoji(savedEmoji);
        setEditing(true);
    }

    function remove() {
        mutation.run(
            () => personClient.interactions.removeRating({ id: personId }),
            (next) => {
                setRating(next);
                setComment("");
                setScore(0);
                setEditing(false);
                changed();
            },
            false,
        );
    }

    return (
        <Flex direction="column" gap="4">
            <MutationFeedback {...mutation} />
            {signedIn && rating.value && !editing ? (
                <Flex
                    as="article"
                    direction="column"
                    gap="3"
                    className={styles.review}
                    aria-label={t("yourReview")}
                >
                    <Text variant="subheader-2">{t("yourReview")}</Text>
                    <Text
                        className={styles.savedScore}
                        aria-label={t("ratingValue", { value: rating.value })}
                    >
                        {savedEmoji.repeat(rating.value)}
                    </Text>
                    {rating.comment && (
                        <ContentText
                            className={styles.comment}
                            text={rating.comment}
                        />
                    )}
                    {rating.commentStatus === "PENDING" && (
                        <Label theme="warning">{t("onModeration")}</Label>
                    )}
                    <Flex gap="2" justifyContent="flex-end">
                        <Button
                            size="l"
                            view="flat"
                            disabled={mutation.pending}
                            onClick={edit}
                        >
                            <Icon data={Pencil} size={18} />
                            {t("edit")}
                        </Button>
                        <Button
                            size="l"
                            view="flat-danger"
                            disabled={mutation.pending}
                            onClick={() => setConfirmingRemoval(true)}
                            aria-label={t("removeRating")}
                            title={t("removeRating")}
                        >
                            <Icon data={TrashBin} size={18} />
                        </Button>
                    </Flex>
                </Flex>
            ) : (
                <>
                    <Text color="secondary" className={styles.hint}>
                        {t(signedIn ? "rateHint" : "signInHint")}
                    </Text>
                    <Flex
                        gap="3"
                        alignItems="center"
                        justifyContent="center"
                        className={styles.ratingRow}
                    >
                        <Flex
                            gap="1"
                            role="group"
                            aria-label={t("rateOutOfFive")}
                            onMouseLeave={() => setHovered(0)}
                        >
                            {SCORES.map((value) => (
                                <Box
                                    as="button"
                                    type="button"
                                    key={value}
                                    className={styles.score}
                                    data-filled={value <= (hovered || score)}
                                    aria-label={t("giveRating", { value })}
                                    aria-pressed={score === value}
                                    disabled={!signedIn || mutation.pending}
                                    onMouseEnter={() => setHovered(value)}
                                    onFocus={() => setHovered(value)}
                                    onBlur={() => setHovered(0)}
                                    onClick={() => setScore(value)}
                                >
                                    {emoji}
                                </Box>
                            ))}
                        </Flex>
                    </Flex>
                    {signedIn ? (
                        <CommentComposer
                            value={comment}
                            onChange={setComment}
                            pending={mutation.pending}
                            inputLabel={t("ratingComment")}
                            placeholder={t("ratingCommentPlaceholder")}
                            maxLength={1000}
                            allowEmpty
                            submitLabel={t(editing ? "saveChanges" : "send")}
                            showSubmitLabel={editing}
                            submitDisabled={!score}
                            onSubmit={save}
                            beforeSubmit={
                                <>
                                    {editing && (
                                        <Button
                                            size="l"
                                            view="flat"
                                            disabled={mutation.pending}
                                            onClick={() => setEditing(false)}
                                        >
                                            {t("cancel")}
                                        </Button>
                                    )}
                                    <EmojiPicker
                                        value={emoji}
                                        emojis={emojis}
                                        disabled={mutation.pending}
                                        onChange={setEmoji}
                                    />
                                </>
                            }
                        />
                    ) : (
                        <Flex justifyContent="flex-end">
                            <EmojiPicker
                                value={emoji}
                                emojis={emojis}
                                disabled
                                onChange={setEmoji}
                            />
                        </Flex>
                    )}
                </>
            )}
            <RatingsFeed
                revision={revision}
                personId={personId}
                signedIn={signedIn}
                publicUrl={publicUrl}
                hideOwn={signedIn && Boolean(rating.value)}
            />
            {confirmingRemoval && (
                <ConfirmRemovalDialog
                    pending={mutation.pending}
                    onClose={() => setConfirmingRemoval(false)}
                    onConfirm={() => {
                        setConfirmingRemoval(false);
                        remove();
                    }}
                />
            )}
        </Flex>
    );
}
