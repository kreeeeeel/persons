"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Button, Flex, Icon } from "@gravity-ui/uikit";
import { Pencil, TrashBin } from "@gravity-ui/icons";
import { useTranslate } from "@persons/i18n";
import { ConfirmRemovalDialog } from "@persons/person-domain/ConfirmRemovalDialog";
import styles from "@persons/person-domain/ContentActions/ContentActions.module.css";

export function ContentActions({
    children,
    onEdit,
    onRemove,
    pending,
    className,
}: {
    readonly children: ReactNode;
    readonly onEdit?: () => void;
    readonly onRemove?: () => void;
    readonly pending?: boolean;
    readonly className?: string;
}) {
    const t = useTranslate("person");
    const [confirming, setConfirming] = useState(false);
    return (
        <Flex
            alignItems="flex-start"
            justifyContent="space-between"
            gap="2"
            className={[styles.root, className].filter(Boolean).join(" ")}
        >
            {children}
            <Flex alignItems="center" gap="1" className={styles.actions}>
                {onEdit && (
                    <Button
                        size="l"
                        view="flat"
                        className={styles.button}
                        disabled={pending}
                        aria-label={t("edit")}
                        title={t("edit")}
                        onClick={onEdit}
                    >
                        <Icon data={Pencil} size={18} />
                    </Button>
                )}
                {onRemove && (
                    <Button
                        size="l"
                        view="flat-danger"
                        className={styles.button}
                        disabled={pending}
                        aria-label={t("remove")}
                        title={t("remove")}
                        onClick={() => setConfirming(true)}
                    >
                        <Icon data={TrashBin} size={18} />
                    </Button>
                )}
            </Flex>
            {confirming && (
                <ConfirmRemovalDialog
                    pending={pending}
                    onClose={() => setConfirming(false)}
                    onConfirm={() => {
                        setConfirming(false);
                        onRemove?.();
                    }}
                />
            )}
        </Flex>
    );
}
