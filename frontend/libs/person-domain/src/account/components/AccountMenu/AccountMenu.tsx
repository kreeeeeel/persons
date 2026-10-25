"use client";

import { notifyAccountProfileChanged } from "@persons/person-domain/account/profileChanges";

import { useAccountActions } from "@persons/person-domain/account/AccountActionsContext";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Alert,
    Box,
    Button,
    DropdownMenu,
    Flex,
    Icon,
    Text,
} from "@gravity-ui/uikit";
import {
    ChevronDown,
    Person,
    ArrowRightFromSquare,
    Bell,
    Gear,
    SquareListUl,
} from "@gravity-ui/icons";
import { NotificationsDialog } from "@persons/person-domain/NotificationsDialog";
import { SettingsCenter } from "@persons/person-domain/account/components/SettingsCenter/SettingsCenter";
import { LoadedAvatar } from "@persons/ui";
import { useLocale, useTranslate } from "@persons/i18n";
import { personClient } from "@persons/person-domain/api/browser";
import { usePersonData } from "@persons/person-domain/hooks/usePersonData";
import type { AccountMenuProps } from "@persons/person-domain/account/components/AccountMenu/AccountMenu.types";
import styles from "@persons/person-domain/account/components/AccountMenu/AccountMenu.module.css";

export function AccountMenu({
    user,
    profileHref,
    adminHref,
    sidebar,
    publicUrl,
}: AccountMenuProps) {
    const actions = useAccountActions();
    const { signOut } = actions;
    const t = useTranslate("account");
    const locale = useLocale();
    const publicationsPath = `/${locale}/my-publications`;
    const publicationsHref = publicUrl
        ? new URL(publicationsPath, publicUrl).href
        : publicationsPath;
    const loadUnread = useCallback(
        async (signal: AbortSignal) =>
            personClient.notifications.listNotifications(
                { page: 0, size: 1 },
                { signal },
            ),
        [],
    );
    const notificationCount = usePersonData(
        "account-notification-count",
        loadUnread,
    );
    const unread = notificationCount.data?.unread ?? 0;
    const refreshUnread = notificationCount.refresh;
    useEffect(() => {
        const refreshVisible = () => {
            if (document.visibilityState === "visible") {
                refreshUnread();
            }
        };
        window.addEventListener("focus", refreshVisible);
        document.addEventListener("visibilitychange", refreshVisible);
        return () => {
            window.removeEventListener("focus", refreshVisible);
            document.removeEventListener("visibilitychange", refreshVisible);
        };
    }, [refreshUnread]);
    const router = useRouter();
    const [settings, setSettings] = useState(false);
    const [avatar, setAvatar] = useState<string>();
    const avatarSrc = avatar ?? (user.hasAvatar ? "/api/avatar" : undefined);
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState(false);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState(false);

    function logout() {
        setError(false);
        startTransition(async () => {
            const result = await signOut();

            if (result.ok) {
                router.refresh();
            } else {
                setError(true);
            }
        });
    }

    return (
        <Box className={`${styles.root} ${sidebar ? styles.sidebar : ""}`}>
            <DropdownMenu
                size="xl"
                open={open}
                onOpenToggle={setOpen}
                disabled={pending}
                popupProps={{
                    placement: sidebar ? "top-start" : "bottom-end",
                    strategy: "fixed",
                    floatingClassName: styles.popup,
                }}
                items={[
                    {
                        text: t("myPage"),
                        href: profileHref,
                        action: (event) => {
                            const target = new URL(
                                profileHref,
                                window.location.origin,
                            );
                            if (
                                target.origin === window.location.origin &&
                                !event?.metaKey &&
                                !event?.ctrlKey &&
                                !event?.shiftKey &&
                                !event?.altKey
                            ) {
                                event?.preventDefault();
                                router.push(
                                    `${target.pathname}${target.search}`,
                                );
                            }
                        },
                        iconStart: <Icon data={Person} />,
                    },
                    {
                        text: t("myPublications"),
                        href: publicationsHref,
                        iconStart: <Icon data={SquareListUl} />,
                    },
                    {
                        text: t("notifications"),
                        action: () => setNotifications(true),
                        iconStart: <Icon data={Bell} />,
                        iconEnd:
                            unread > 0 ? (
                                <Text
                                    className={`${styles.badge} ${styles.menuBadge}`}
                                    data-overflow={unread > 99}
                                    aria-label={t("unreadNotifications", {
                                        count: unread,
                                    })}
                                >
                                    {unread > 99 ? "99+" : unread}
                                </Text>
                            ) : undefined,
                    },
                    [
                        {
                            text: t("settings"),
                            action: () => setSettings(true),
                            iconStart: <Icon data={Gear} />,
                        },
                        ...(user.role === "ADMIN" && adminHref
                            ? [
                                  {
                                      text: t("adminPanel"),
                                      href: adminHref,
                                      target: "_blank",
                                      rel: "noopener noreferrer",
                                      iconStart: <Icon data={Gear} />,
                                  },
                              ]
                            : []),
                    ],
                    [
                        {
                            text: t("signOut"),
                            action: logout,
                            theme: "danger",
                            iconStart: <Icon data={ArrowRightFromSquare} />,
                        },
                    ],
                ]}
                renderSwitcher={(props) => (
                    <Button
                        {...props}
                        size="xl"
                        view="normal"
                        disabled={pending}
                        loading={pending}
                        className={styles.switcher}
                        aria-label={t("menu", { name: user.firstName })}
                        aria-haspopup="menu"
                        aria-expanded={open}
                    >
                        <Flex
                            alignItems="center"
                            gap="2"
                            className={styles.content}
                        >
                            <Box className={styles.avatar}>
                                <LoadedAvatar
                                    name={`${user.firstName} ${user.lastName}`}
                                    src={avatarSrc}
                                    size={sidebar ? 40 : 32}
                                />
                                {unread > 0 && (
                                    <Text
                                        className={`${styles.badge} ${styles.avatarBadge}`}
                                        data-overflow={unread > 99}
                                        aria-label={t("unreadNotifications", {
                                            count: unread,
                                        })}
                                    >
                                        {unread > 99 ? "99+" : unread}
                                    </Text>
                                )}
                            </Box>
                            <Flex
                                direction="column"
                                className={styles.identity}
                            >
                                <Text className={styles.name}>
                                    {user.firstName}
                                </Text>
                                {sidebar && (
                                    <Text
                                        className={styles.email}
                                        color="secondary"
                                    >
                                        {user.email}
                                    </Text>
                                )}
                            </Flex>
                            <Icon
                                data={ChevronDown}
                                size={16}
                                className={styles.chevron}
                            />
                        </Flex>
                    </Button>
                )}
            />
            {settings && (
                <SettingsCenter
                    user={user}
                    showMarqueeSetting={!sidebar}
                    avatar={avatarSrc}
                    onClose={() => setSettings(false)}
                    onAvatarSaved={(image) => {
                        setAvatar(image);
                        notifyAccountProfileChanged();
                        router.refresh();
                    }}
                />
            )}
            {error && (
                <Alert
                    theme="danger"
                    message={t("signOutError")}
                    className={styles.error}
                />
            )}
            {notifications && (
                <NotificationsDialog
                    publicUrl={publicUrl}
                    onRead={refreshUnread}
                    onClose={() => {
                        setNotifications(false);
                        refreshUnread();
                        router.refresh();
                    }}
                />
            )}
        </Box>
    );
}
