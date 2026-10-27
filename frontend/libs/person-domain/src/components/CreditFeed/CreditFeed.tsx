"use client";

import { useCallback, useState, type Ref } from "react";
import { Button, Flex, Icon, Label, Select, Text } from "@gravity-ui/uikit";
import { ChevronDown, Xmark } from "@gravity-ui/icons";
import { CommentComposer } from "@persons/person-domain/CommentComposer";
import { useTranslate } from "@persons/i18n";
import type { CreditKind } from "@persons/person-client";
import { personClient } from "@persons/person-domain/api/browser";
import { useInfinitePersonData } from "@persons/person-domain/hooks/useInfinitePersonData";
import type { FeedSort } from "@persons/person-client";
import { FeedSortControl } from "@persons/person-domain/FeedSortControl";
import { ContentActions } from "@persons/person-domain/ContentActions";
import { ContentLike } from "@persons/person-domain/ContentLike";
import { CreditEntryContent } from "@persons/person-domain/CreditEntryContent";
import { FeedContent } from "@persons/person-domain/FeedContent";
import { CommentAuthor } from "@persons/person-domain/CommentAuthor";
import { InfiniteFeedLoader } from "@persons/person-domain/InfiniteFeedLoader";
import { MutationFeedback } from "@persons/person-domain/MutationFeedback";
import { usePersonMutation } from "@persons/person-domain/hooks/usePersonMutation";
import type { PanelProps } from "@persons/person-domain/CreditFeed/CreditFeed.types";
import styles from "@persons/person-domain/CreditFeed/CreditFeed.module.css";

const PAGE_SIZE = 10;

export function CreditFeed({ personId, signedIn, publicUrl }: PanelProps) {
    const t = useTranslate("person");
    const [mine, setMine] = useState(false);
    const [editDescription, setEditDescription] = useState("");
    const [editKind, setEditKind] = useState<CreditKind>("ON_TIME");
    const [sort, setSort] = useState<FeedSort>("NEWEST");
    const [description, setDescription] = useState("");
    const [kind, setKind] = useState<CreditKind>("ON_TIME");
    const [editing, setEditing] = useState<string>();
    const mutation = usePersonMutation();
    const load = useCallback(
        (page: number, signal: AbortSignal) =>
            personClient.interactions.listCredit(
                { id: personId, page, size: PAGE_SIZE, sort, mine },
                { signal },
            ),
        [personId, sort, mine],
    );
    const resource = useInfinitePersonData(
        `credit:${personId}:${sort}:${mine}`,
        load,
    );

    const composer = (
        <CommentComposer
            value={editing ? editDescription : description}
            onChange={editing ? setEditDescription : setDescription}
            pending={mutation.pending}
            inputLabel={t("creditDescription")}
            placeholder={t("creditDescription")}
            maxLength={1000}
            submitLabel={t(editing ? "saveChanges" : "send")}
            showSubmitLabel={Boolean(editing)}
            onSubmit={() => {
                mutation.run(
                    () =>
                        editing
                            ? personClient.interactions.editCredit({
                                  id: editing,
                                  creditInput: {
                                      kind: editKind,
                                      description: editDescription,
                                  },
                              })
                            : personClient.interactions.createCredit({
                                  id: personId,
                                  creditInput: { kind, description },
                              }),
                    () => {
                        if (!editing) {
                            setDescription("");
                        }
                        setEditing(undefined);
                        resource.refresh();
                    },
                );
            }}
            footerStart={
                <Select
                    className={styles.status}
                    size="l"
                    value={[editing ? editKind : kind]}
                    options={(
                        [
                            "ON_TIME",
                            "SHORT_DELAY",
                            "LONG_DELAY",
                            "NOT_RETURNED",
                        ] as const
                    ).map((value) => ({
                        value,
                        content: t(value),
                    }))}
                    onUpdate={([value]) =>
                        (editing ? setEditKind : setKind)(value as CreditKind)
                    }
                    disabled={mutation.pending}
                    aria-label={t("credit")}
                    renderControl={({ ref, triggerProps }) => (
                        <Button
                            {...triggerProps}
                            ref={ref as Ref<HTMLButtonElement>}
                            type="button"
                            size="l"
                            view="flat"
                            className={styles.statusButton}
                        >
                            <Icon data={ChevronDown} size={16} />
                            <Text className={styles.statusText}>
                                {t(editing ? editKind : kind)}
                            </Text>
                        </Button>
                    )}
                />
            }
            beforeSubmit={
                editing && (
                    <Button
                        size="l"
                        view="flat"
                        type="button"
                        aria-label={t("cancel")}
                        onClick={() => {
                            setEditing(undefined);
                        }}
                    >
                        <Icon data={Xmark} size={20} />
                    </Button>
                )
            }
        />
    );

    return (
        <Flex direction="column" gap="4">
            <MutationFeedback {...mutation} />
            {signedIn && !editing && composer}
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
            <FeedContent
                loading={resource.loading}
                error={resource.error}
                retainContentOnError={resource.data !== undefined}
                empty={!resource.data?.items.length}
                emptyTitle={t("emptyCredit")}
                emptyDescription=""
                illustration="history"
                onRetry={resource.refresh}
            >
                {resource.data?.items.map((item) => (
                    <Flex
                        key={item.id}
                        direction="column"
                        gap="3"
                        className={styles.card}
                    >
                        {editing === item.id ? (
                            composer
                        ) : (
                            <>
                                <CreditEntryContent entry={item} />
                                <CommentAuthor
                                    comment={item}
                                    publicUrl={publicUrl}
                                />
                                {item.moderationStatus === "PENDING" && (
                                    <Label theme="warning">
                                        {t("onModeration")}
                                    </Label>
                                )}
                                <ContentActions
                                    pending={mutation.pending}
                                    onEdit={
                                        item.canRemove
                                            ? () => {
                                                  setEditing(item.id);
                                                  setEditKind(item.kind);
                                                  setEditDescription(
                                                      item.description,
                                                  );
                                              }
                                            : undefined
                                    }
                                    onRemove={
                                        item.canRemove
                                            ? () =>
                                                  mutation.run(
                                                      () =>
                                                          personClient.interactions.deleteCredit(
                                                              { id: item.id },
                                                          ),
                                                      resource.refresh,
                                                  )
                                            : undefined
                                    }
                                >
                                    <ContentLike
                                        key={`${item.id}:${item.likes}:${item.likedByMe}:${item.dislikes}:${item.dislikedByMe}`}
                                        kind="LOAN"
                                        id={item.id}
                                        likes={item.likes}
                                        liked={item.likedByMe}
                                        dislikes={item.dislikes}
                                        disliked={item.dislikedByMe}
                                        signedIn={signedIn}
                                        disabled={
                                            item.moderationStatus === "PENDING"
                                        }
                                    />
                                </ContentActions>
                            </>
                        )}
                    </Flex>
                ))}
            </FeedContent>
            <InfiniteFeedLoader {...resource} />
        </Flex>
    );
}
