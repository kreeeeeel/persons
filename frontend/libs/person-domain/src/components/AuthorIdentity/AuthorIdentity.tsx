"use client";

import { Flex, Text } from "@gravity-ui/uikit";
import { useLocale } from "@persons/i18n";
import { AppLink } from "@persons/ui/AppLink";
import { LoadedAvatar } from "@persons/ui";
import type { AuthorIdentityProps } from "@persons/person-domain/AuthorIdentity/AuthorIdentity.types";
import styles from "@persons/person-domain/AuthorIdentity/AuthorIdentity.module.css";

export function AuthorIdentity({
    author,
    description,
    publicUrl,
    centered,
}: AuthorIdentityProps) {
    const locale = useLocale();
    const path = `/${locale}/publications/${encodeURIComponent(author.handle)}`;
    return (
        <AppLink
            href={publicUrl ? new URL(path, publicUrl).href : path}
            className={styles.link}
        >
            <Flex
                direction={centered ? "column" : "row"}
                alignItems="center"
                gap="3"
                className={centered ? styles.centered : styles.identity}
            >
                <LoadedAvatar
                    size={centered ? 88 : 44}
                    src={author.avatarUrl}
                    name={author.fullName}
                />
                <Flex direction="column" gap="1" className={styles.text}>
                    <Text
                        as={centered ? "h1" : "span"}
                        title={author.fullName}
                        className={centered ? styles.title : styles.name}
                    >
                        {author.fullName}
                    </Text>
                    {description && (
                        <Text color="secondary" className={styles.description}>
                            {description}
                        </Text>
                    )}
                </Flex>
            </Flex>
        </AppLink>
    );
}
