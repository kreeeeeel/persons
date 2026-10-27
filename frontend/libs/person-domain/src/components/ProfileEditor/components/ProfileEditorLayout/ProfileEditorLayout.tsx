"use client";

import { useId, useRef } from "react";
import type { KeyboardEvent } from "react";
import {
    Button,
    Dialog,
    Flex,
    Icon,
    Menu,
    Select,
    Text,
} from "@gravity-ui/uikit";
import { Xmark } from "@gravity-ui/icons";
import { useTranslate } from "@persons/i18n";
import type { ProfileEditorLayoutProps } from "@persons/person-domain/ProfileEditor/components/ProfileEditorLayout/ProfileEditorLayout.types";
import type { ProfileEditorSection } from "@persons/person-domain/ProfileEditor/ProfileEditor.types";
import {
    profileEditorGroups,
    profileEditorSections,
} from "@persons/person-domain/ProfileEditor/components/ProfileEditorLayout/profileEditorSections";
import styles from "@persons/person-domain/ProfileEditor/components/ProfileEditorLayout/ProfileEditorLayout.module.css";

export function ProfileEditorLayout({
    title,
    identity,
    section,
    onSelect,
    pending,
    administrator,
    onClose,
    onSave,
    children,
}: ProfileEditorLayoutProps) {
    const t = useTranslate("person");
    const formId = useId();
    const navigation = useRef<HTMLDivElement>(null);
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
    const close = () => {
        if (!pending) {
            onClose();
        }
    };
    return (
        <Dialog
            open
            fullWidth
            maxWidth="l"
            hasCloseButton={false}
            aria-label={title}
            className={styles.dialog}
            modalClassName={styles.modal}
            onClose={close}
        >
            <Flex className={styles.shell}>
                <Flex
                    direction="column"
                    className={styles.sidebar}
                    ref={navigation}
                    onKeyDown={navigate}
                >
                    <Flex
                        className={styles.identity}
                        role="group"
                        aria-label={t("editorProfile")}
                    >
                        {identity}
                    </Flex>
                    <Menu
                        size="xl"
                        aria-label={t("editorSections")}
                        className={styles.navigation}
                    >
                        {profileEditorGroups.map((group) => (
                            <Menu.Group
                                key={group.id}
                                label={t(`editorGroup${group.id}`)}
                                className={styles.navigationGroup}
                            >
                                {profileEditorSections
                                    .filter((item) =>
                                        group.sections.some(
                                            (id) => id === item.id,
                                        ),
                                    )
                                    .map(({ id, icon }) => (
                                        <Menu.Item
                                            key={id}
                                            className={styles.navigationItem}
                                            selected={section === id}
                                            disabled={pending}
                                            iconStart={
                                                <Icon data={icon} size={18} />
                                            }
                                            extraProps={{
                                                "aria-current":
                                                    section === id
                                                        ? "page"
                                                        : undefined,
                                            }}
                                            onClick={() => onSelect(id)}
                                        >
                                            {t(`editorSection${id}`)}
                                        </Menu.Item>
                                    ))}
                            </Menu.Group>
                        ))}
                    </Menu>
                </Flex>
                <Flex
                    as="form"
                    id={formId}
                    direction="column"
                    className={styles.main}
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSave();
                    }}
                >
                    <Flex direction="column" gap="3" className={styles.header}>
                        <Text as="h1" variant="header-1">
                            {title}
                        </Text>
                        <Select
                            className={styles.mobileNavigation}
                            size="l"
                            width="max"
                            label={t("editorSections")}
                            aria-label={t("editorSections")}
                            value={[section]}
                            disabled={pending}
                            options={profileEditorGroups.map((group) => ({
                                label: t(`editorGroup${group.id}`),
                                options: group.sections.map((value) => ({
                                    value,
                                    content: t(`editorSection${value}`),
                                })),
                            }))}
                            onUpdate={([value]) => {
                                if (
                                    profileEditorSections.some(
                                        (item) => item.id === value,
                                    )
                                ) {
                                    onSelect(value as ProfileEditorSection);
                                }
                            }}
                        />
                    </Flex>
                    <Flex
                        direction="column"
                        gap="4"
                        className={styles.panel}
                        role="region"
                        aria-label={t(`editorSection${section}`)}
                        key={section}
                    >
                        <Text as="h2" variant="header-1">
                            {t(`editorSection${section}`)}
                        </Text>
                        {children}
                    </Flex>
                    <Flex
                        gap="3"
                        justifyContent="flex-end"
                        className={styles.footer}
                    >
                        <Button
                            size="l"
                            view="flat"
                            disabled={pending}
                            onClick={close}
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            size="l"
                            view="action"
                            loading={pending}
                        >
                            {t(administrator ? "saveDirect" : "save")}
                        </Button>
                    </Flex>
                </Flex>
                <Button
                    view="flat"
                    size="l"
                    pin="circle-circle"
                    className={styles.close}
                    aria-label={t("close")}
                    disabled={pending}
                    onClick={close}
                >
                    <Icon data={Xmark} size={20} />
                </Button>
            </Flex>
        </Dialog>
    );
}
