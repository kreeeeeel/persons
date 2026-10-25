"use client";

import { Button, Flex, Icon, Popover, Text } from "@gravity-ui/uikit";
import { Persons } from "@gravity-ui/icons";
import { AppLink } from "@persons/ui/AppLink";
import { PersonIdentity } from "@persons/person-domain/PersonIdentity";
import { useTranslate } from "@persons/i18n";
import type { TaggedPersonsButtonProps } from "@persons/person-domain/TaggedPersonsButton/TaggedPersonsButton.types";
import styles from "@persons/person-domain/TaggedPersonsButton/TaggedPersonsButton.module.css";

const HOVER_DELAY_MS = 120;
const CLOSE_DELAY_MS = 200;

export function TaggedPersonsButton({
    persons,
    publicUrl,
}: TaggedPersonsButtonProps) {
    const t = useTranslate("person");
    return (
        <Popover
            disabled={!persons.length}
            placement={["bottom-end", "top-end"]}
            openDelay={HOVER_DELAY_MS}
            closeDelay={CLOSE_DELAY_MS}
            enableSafePolygon
            className={styles.popup}
            aria-label={t("taggedPeople")}
            content={
                <Flex direction="column" gap="3" className={styles.content}>
                    <Text variant="subheader-2">{t("taggedPeople")}</Text>
                    {persons.map((person) => (
                        <AppLink
                            key={person.id}
                            className={styles.person}
                            href={
                                publicUrl
                                    ? new URL(`/${person.tag}`, publicUrl).href
                                    : `/${person.tag}`
                            }
                            target={publicUrl ? "_blank" : undefined}
                            rel={publicUrl ? "noopener noreferrer" : undefined}
                        >
                            <PersonIdentity person={person} />
                        </AppLink>
                    ))}
                </Flex>
            }
        >
            <Button
                size="l"
                view="flat"
                aria-label={t("taggedPeopleCount", { count: persons.length })}
                className={styles.trigger}
            >
                <Icon data={Persons} size={20} />
                {persons.length}
            </Button>
        </Popover>
    );
}
