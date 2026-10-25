"use client";

import { useCallback, useId, useState } from "react";
import {
    Alert,
    Button,
    Dialog,
    Flex,
    Select,
    Text,
    TextArea,
} from "@gravity-ui/uikit";
import { LoadedImage } from "@persons/ui";
import { EmptyState } from "@persons/person-domain/EmptyState";
import { useTranslate } from "@persons/i18n";
import { personClient, personError } from "@persons/person-domain/api/browser";
import { useInfinitePersonData } from "@persons/person-domain/hooks/useInfinitePersonData";
import type { PersonProfile } from "@persons/person-client";
import styles from "@persons/person-domain/PersonAchievementGrantDialog/PersonAchievementGrantDialog.module.css";
import dialogStyles from "@persons/person-domain/FormDialog/FormDialog.module.css";

const PAGE_SIZE = 20;
const OPTION_HEIGHT = 64;

export function PersonAchievementGrantDialog({
    profile,
    onClose,
    onSaved,
}: {
    readonly profile: Pick<PersonProfile, "id" | "fullName">;
    readonly onClose: () => void;
    readonly onSaved: () => void;
}) {
    const t = useTranslate("person");
    const noteId = useId();
    const [selected, setSelected] = useState<string[]>([]);
    const [note, setNote] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string>();
    const load = useCallback(
        (page: number, signal: AbortSignal) =>
            personClient.achievements.listAchievements(
                { page, size: PAGE_SIZE },
                { signal },
            ),
        [],
    );
    const resource = useInfinitePersonData("grant:achievements", load);
    const choice = resource.data?.items.find(
        (achievement) => achievement.id === selected[0],
    );
    async function grant() {
        if (!choice?.active || choice.type !== "MANUAL") {
            return;
        }
        setPending(true);
        setError(undefined);
        try {
            await personClient.achievements.grantAchievement({
                id: choice.id,
                achievementGrantInput: {
                    personIds: new Set([profile.id]),
                    note,
                },
            });
            onSaved();
        } catch (failure) {
            setError(await personError(failure));
        } finally {
            setPending(false);
        }
    }
    return (
        <Dialog
            open
            fullWidth
            modalClassName={dialogStyles.modal}
            hasCloseButton
            onClose={() => {
                if (!pending) {
                    onClose();
                }
            }}
        >
            <Dialog.Header caption={t("grantToPerson")} />
            <Dialog.Body className={dialogStyles.body}>
                <Flex direction="column" gap="4">
                    {(error || resource.error) && (
                        <Alert
                            theme="danger"
                            message={t(
                                error ?? resource.error ?? "UNAVAILABLE",
                            )}
                        />
                    )}
                    {resource.error && (
                        <Button view="flat" onClick={resource.refresh}>
                            {t("retry")}
                        </Button>
                    )}
                    <Text>{profile.fullName}</Text>
                    <Select
                        size="xl"
                        width="max"
                        filterable
                        getOptionHeight={() => OPTION_HEIGHT}
                        value={selected}
                        onUpdate={setSelected}
                        aria-label={t("achievements")}
                        loading={resource.loading || resource.loadingMore}
                        disabled={pending}
                        renderEmptyOptions={() => (
                            <EmptyState
                                illustration="achievements"
                                description={t("emptyAchievements")}
                                compact
                            />
                        )}
                        onLoadMore={() => {
                            if (!resource.loadingMore && resource.hasMore) {
                                resource.loadMore();
                            }
                        }}
                        options={(resource.data?.items ?? []).map(
                            (achievement) => ({
                                value: achievement.id,
                                text: achievement.title,
                                disabled:
                                    !achievement.active ||
                                    achievement.type !== "MANUAL",
                                content: (
                                    <Flex
                                        gap="3"
                                        alignItems="center"
                                        className={styles.option}
                                    >
                                        <LoadedImage
                                            src={`/api/person/v1/achievements/${achievement.id}/image`}
                                            alt=""
                                            width={40}
                                            height={40}
                                        />
                                        <Flex
                                            direction="column"
                                            gap="1"
                                            className={styles.label}
                                        >
                                            <Text ellipsis>
                                                {achievement.title}
                                            </Text>
                                            {(!achievement.active ||
                                                achievement.type !==
                                                    "MANUAL") && (
                                                <Text
                                                    color="secondary"
                                                    ellipsis
                                                >
                                                    {t(
                                                        !achievement.active
                                                            ? "unavailableAchievement"
                                                            : "achievementAutomatic",
                                                    )}
                                                </Text>
                                            )}
                                        </Flex>
                                    </Flex>
                                ),
                            }),
                        )}
                    />
                    <Text as="label" htmlFor={noteId}>
                        {t("achievementNote")}
                    </Text>
                    <TextArea
                        value={note}
                        onUpdate={setNote}
                        minRows={3}
                        size="xl"
                        disabled={pending}
                        controlProps={{ id: noteId, maxLength: 500 }}
                    />
                </Flex>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t("cancel")}
                onClickButtonCancel={onClose}
                textButtonApply={t("grantToPerson")}
                propsButtonApply={{
                    disabled:
                        !choice?.active || choice.type !== "MANUAL" || pending,
                }}
                onClickButtonApply={() => void grant()}
                loading={pending}
            />
        </Dialog>
    );
}
