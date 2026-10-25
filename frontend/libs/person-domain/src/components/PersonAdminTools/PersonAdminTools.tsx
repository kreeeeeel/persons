"use client";

import { useState } from "react";
import { Button, DropdownMenu, Icon } from "@gravity-ui/uikit";
import {
    Bug,
    Camera,
    Medal,
    Pencil,
    Person,
    ShieldCheck,
    Ban,
} from "@gravity-ui/icons";
import { useTranslate } from "@persons/i18n";
import type { ModerationReceipt, PersonProfile } from "@persons/person-client";
import { ProfileEditor } from "@persons/person-domain/ProfileEditor";
import { MediaUploader } from "@persons/person-domain/MediaUploader";
import { PersonOwnerDialog } from "@persons/person-domain/PersonOwnerDialog";
import { ReputationOverrideDialog } from "@persons/person-domain/ReputationOverrideDialog";
import { PersonAchievementGrantDialog } from "@persons/person-domain/PersonAchievementGrantDialog";
import { PersonRestrictionsDialog } from "@persons/person-domain/PersonRestrictionsDialog";
import styles from "@persons/person-domain/PersonAdminTools/PersonAdminTools.module.css";

type Tool =
    "edit" | "avatar" | "owner" | "reputation" | "achievement" | "restrictions";

export function PersonAdminTools({
    profile,
    onSaved,
}: {
    readonly profile: PersonProfile;
    readonly onSaved: (tag?: string) => void;
}) {
    const t = useTranslate("person");
    const [tool, setTool] = useState<Tool>();
    const [open, setOpen] = useState(false);
    const close = () => setTool(undefined);
    const saved = (receipt?: ModerationReceipt, tag?: string) => {
        close();
        onSaved(
            receipt?.status === "APPROVED" && tag !== profile.tag
                ? tag
                : undefined,
        );
    };
    const actions = [
        { value: "edit", label: "editPage", icon: Pencil },
        { value: "avatar", label: "changeAvatar", icon: Camera },
        { value: "owner", label: "owner", icon: Person },
        { value: "reputation", label: "reputationOverride", icon: ShieldCheck },
        { value: "achievement", label: "grantToPerson", icon: Medal },
        { value: "restrictions", label: "manageRestrictions", icon: Ban },
    ] as const;
    return (
        <>
            <DropdownMenu
                size="xl"
                open={open}
                onOpenToggle={setOpen}
                switcherWrapperClassName={styles.anchor}
                popupProps={{
                    placement: "right-start",
                    strategy: "fixed",
                    floatingClassName: styles.popup,
                    offset: 12,
                }}
                items={actions.map((action) => ({
                    text: t(action.label),
                    iconStart: <Icon data={action.icon} size={20} />,
                    action: () => {
                        setOpen(false);
                        setTool(action.value);
                    },
                }))}
                renderSwitcher={(props) => (
                    <Button
                        {...props}
                        size="xl"
                        view="flat"
                        pin="circle-circle"
                        className={styles.trigger}
                        aria-label={t("pageTools")}
                        title={t("pageTools")}
                        aria-haspopup="menu"
                        aria-expanded={open}
                    >
                        <Icon data={Bug} size={26} />
                    </Button>
                )}
            />
            {tool === "edit" && (
                <ProfileEditor
                    administrator
                    profile={profile}
                    onClose={close}
                    onSaved={saved}
                />
            )}
            {tool === "avatar" && (
                <MediaUploader
                    personId={profile.id}
                    kind="AVATAR"
                    onClose={close}
                    onSaved={saved}
                />
            )}
            {tool === "owner" && (
                <PersonOwnerDialog
                    personId={profile.id}
                    onClose={close}
                    onSaved={saved}
                />
            )}
            {tool === "reputation" && (
                <ReputationOverrideDialog
                    profile={profile}
                    onClose={close}
                    onSaved={saved}
                />
            )}
            {tool === "achievement" && (
                <PersonAchievementGrantDialog
                    profile={profile}
                    onClose={close}
                    onSaved={saved}
                />
            )}
            {tool === "restrictions" && (
                <PersonRestrictionsDialog
                    profile={profile}
                    onClose={close}
                    onSaved={saved}
                    onLinkAccount={() => setTool("owner")}
                />
            )}
        </>
    );
}
