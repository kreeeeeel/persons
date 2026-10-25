"use client";

import { useState } from "react";
import { Button, Dialog, Flex, Text } from "@gravity-ui/uikit";
import { LoadedImage } from "@persons/ui";
import { useTranslate } from "@persons/i18n";
import { ContentTime } from "@persons/person-domain/ContentTime";
import { ConfirmRemovalDialog } from "@persons/person-domain/ConfirmRemovalDialog";
import { AchievementType } from "@persons/person-client";
import type { AchievementDialogProps } from "@persons/person-domain/AchievementDialog/AchievementDialog.types";
import styles from "@persons/person-domain/AchievementDialog/AchievementDialog.module.css";

export function AchievementDialog({
    item,
    canManage,
    pending,
    onClose,
    onRevoke,
}: AchievementDialogProps) {
    const t = useTranslate("person");
    const [confirmingRevoke, setConfirmingRevoke] = useState(false);
    return (
        <Dialog
            open
            maxWidth="s"
            fullWidth
            hasCloseButton
            onClose={onClose}
            aria-label={item.achievement.title}
        >
            <Dialog.Body>
                <Flex
                    direction="column"
                    alignItems="center"
                    gap="4"
                    className={styles.content}
                >
                    <LoadedImage
                        width={220}
                        height={220}
                        src={`/api/person/v1/achievements/${item.achievement.id}/image`}
                        alt={item.achievement.title}
                    />
                    <Text as="h2" variant="header-1">
                        {item.achievement.title}
                    </Text>
                    <Text className={styles.description}>
                        {item.achievement.description}
                    </Text>
                    <ContentTime date={item.assignedAt} />
                    {item.note && <Text color="secondary">{item.note}</Text>}
                    {item.achievement.type === AchievementType.Automatic && (
                        <Text color="secondary">
                            {t("achievementAutomaticAward", {
                                years: item.achievement.pageAgeYears ?? 1,
                            })}
                        </Text>
                    )}
                    {canManage &&
                        item.achievement.type === AchievementType.Manual && (
                            <Button
                                size="l"
                                view="flat-danger"
                                loading={pending}
                                disabled={pending}
                                onClick={() => setConfirmingRevoke(true)}
                            >
                                {t("revokeAchievement")}
                            </Button>
                        )}
                </Flex>
            </Dialog.Body>
            {confirmingRevoke &&
                canManage &&
                item.achievement.type === AchievementType.Manual && (
                    <ConfirmRemovalDialog
                        title={t("confirmAchievementRevoke")}
                        description={t("confirmAchievementRevokeDescription", {
                            title: item.achievement.title,
                        })}
                        confirmLabel={t("revokeAchievement")}
                        pending={pending}
                        onClose={() => setConfirmingRevoke(false)}
                        onConfirm={() => {
                            setConfirmingRevoke(false);
                            onRevoke();
                        }}
                    />
                )}
        </Dialog>
    );
}
