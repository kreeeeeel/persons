"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Xmark } from "@gravity-ui/icons";
import {
    Box,
    Button,
    Dialog,
    Flex,
    Icon,
    Menu,
    Select,
    Text,
} from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";
import { useAccountActions } from "@persons/person-domain/account/AccountActionsContext";
import { ProfileSettings } from "@persons/person-domain/account/components/ProfileSettings/ProfileSettings";
import { AvatarDialog } from "@persons/person-domain/account/components/AvatarDialog/AvatarDialog";
import { EmailDialog } from "@persons/person-domain/account/components/EmailDialog/EmailDialog";
import { PasswordDialog } from "@persons/person-domain/account/components/PasswordDialog/PasswordDialog";
import { RestrictionsSettings } from "@persons/person-domain/account/components/RestrictionsSettings/RestrictionsSettings";
import { SessionsSettings } from "@persons/person-domain/account/components/SessionsSettings/SessionsSettings";
import { InterfaceSettings } from "@persons/person-domain/account/components/InterfaceSettings/InterfaceSettings";
import { PlaybackSettings } from "@persons/person-domain/account/components/PlaybackSettings/PlaybackSettings";
import {
    settingsGroups,
    settingsSections,
} from "@persons/person-domain/account/components/SettingsCenter/settingsSections";
import type { SettingsSectionId } from "@persons/person-domain/account/components/SettingsCenter/settingsSections";
import type { SettingsCenterProps } from "@persons/person-domain/account/components/SettingsCenter/SettingsCenter.types";
import styles from "@persons/person-domain/account/components/SettingsCenter/SettingsCenter.module.css";

export function SettingsCenter({
    user,
    showMarqueeSetting,
    avatar,
    onAvatarSaved,
    onClose,
}: SettingsCenterProps) {
    const t = useTranslate("account");
    const common = useTranslate("common");
    const actions = useAccountActions();
    const [selected, setSelected] = useState<SettingsSectionId>("profile");
    const [visited, setVisited] = useState<SettingsSectionId[]>(["profile"]);
    const navigation = useRef<HTMLDivElement>(null);

    function select(section: SettingsSectionId) {
        setSelected(section);
        setVisited((previous) =>
            previous.includes(section) ? previous : [...previous, section],
        );
    }

    function navigate(event: Pick<KeyboardEvent, "key" | "preventDefault">) {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            return;
        }
        const items = Array.from(
            navigation.current?.querySelectorAll<HTMLElement>(
                '[role="menuitem"]',
            ) ?? [],
        );
        if (!items.length) {
            return;
        }
        const current = items.findIndex(
            (item) => item === document.activeElement,
        );
        const next =
            event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : (current +
                        (event.key === "ArrowDown" ? 1 : items.length - 1)) %
                    items.length;
        event.preventDefault();
        items[next].focus();
    }

    return (
        <Dialog
            open
            hasCloseButton={false}
            onClose={onClose}
            aria-label={t("settings")}
            className={styles.dialog}
            modalClassName={styles.modal}
        >
            <Flex className={styles.shell}>
                <Flex
                    direction="column"
                    className={styles.sidebar}
                    ref={navigation}
                    onKeyDown={navigate}
                >
                    <Flex alignItems="center" gap="3" className={styles.brand}>
                        <Box
                            as="img"
                            src="/icon.svg"
                            width={28}
                            height={28}
                            alt=""
                        />
                        <Text variant="subheader-3">{common("brandAlt")}</Text>
                    </Flex>
                    <Menu
                        size="xl"
                        aria-label={t("settingsNavigation")}
                        className={styles.navigation}
                    >
                        {settingsGroups.map((group) => (
                            <Menu.Group
                                key={group.id}
                                label={t(`settingsGroup_${group.id}`)}
                                className={styles.navigationGroup}
                            >
                                {settingsSections
                                    .filter((section) =>
                                        group.sections.some(
                                            (id) => id === section.id,
                                        ),
                                    )
                                    .map(({ id, icon }) => (
                                        <Menu.Item
                                            key={id}
                                            className={styles.navigationItem}
                                            selected={id === selected}
                                            onClick={() => select(id)}
                                            iconStart={
                                                <Icon data={icon} size={18} />
                                            }
                                            extraProps={{
                                                "aria-current":
                                                    id === selected
                                                        ? "page"
                                                        : undefined,
                                            }}
                                        >
                                            {t(`settings_${id}`)}
                                        </Menu.Item>
                                    ))}
                            </Menu.Group>
                        ))}
                    </Menu>
                </Flex>
                <Flex direction="column" className={styles.main}>
                    <Box className={styles.mobileHeading}>
                        <Select
                            size="l"
                            width="max"
                            value={[selected]}
                            aria-label={t("settingsNavigation")}
                            options={settingsGroups.map((group) => ({
                                label: t(`settingsGroup_${group.id}`),
                                options: group.sections.map((id) => ({
                                    value: id,
                                    content: t(`settings_${id}`),
                                })),
                            }))}
                            onUpdate={([id]) => {
                                const section = settingsSections.find(
                                    (item) => item.id === id,
                                );
                                if (section) {
                                    select(section.id);
                                }
                            }}
                        />
                    </Box>
                    {visited.map((id) => (
                        <Box
                            key={id}
                            hidden={id !== selected}
                            className={styles.panel}
                        >
                            <Flex
                                direction="column"
                                gap="5"
                                className={styles.content}
                            >
                                <Flex
                                    direction="column"
                                    gap="2"
                                    className={styles.heading}
                                >
                                    <Text as="h2" variant="header-2">
                                        {t(`settings_${id}`)}
                                    </Text>
                                    <Text
                                        color="secondary"
                                        className={styles.description}
                                    >
                                        {t(`settings_${id}Description`)}
                                    </Text>
                                </Flex>
                                {id === "profile" && (
                                    <ProfileSettings user={user} />
                                )}
                                {id === "avatar" && (
                                    <AvatarDialog
                                        embedded
                                        name={`${user.firstName} ${user.lastName}`}
                                        current={avatar}
                                        saveAvatar={actions.changeAvatar}
                                        onClose={() => select("profile")}
                                        onSaved={onAvatarSaved}
                                    />
                                )}
                                {id === "email" && selected === id && (
                                    <EmailDialog
                                        embedded
                                        email={user.email ?? ""}
                                        actions={actions}
                                        onClose={() => select("profile")}
                                    />
                                )}
                                {id === "password" && selected === id && (
                                    <PasswordDialog
                                        embedded
                                        changePassword={actions.changePassword}
                                        onClose={() => select("profile")}
                                    />
                                )}
                                {id === "sessions" && (
                                    <SessionsSettings actions={actions} />
                                )}
                                {id === "interface" && (
                                    <InterfaceSettings
                                        showMarqueeSetting={showMarqueeSetting}
                                    />
                                )}
                                {id === "player" && <PlaybackSettings />}
                                {id === "restrictions" && (
                                    <RestrictionsSettings />
                                )}
                            </Flex>
                        </Box>
                    ))}
                </Flex>
                <Button
                    view="flat-secondary"
                    size="l"
                    className={styles.close}
                    aria-label={t("closeSettings")}
                    onClick={onClose}
                >
                    <Icon data={Xmark} size={20} />
                </Button>
            </Flex>
        </Dialog>
    );
}
