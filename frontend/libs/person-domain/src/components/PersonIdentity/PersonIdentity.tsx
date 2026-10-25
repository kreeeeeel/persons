import { Flex, Text } from "@gravity-ui/uikit";
import { LoadedAvatar } from "@persons/ui";
import { mediaHref } from "@persons/person-domain/api/browser";
import { compactPersonName } from "@persons/person-domain/format/compactPersonName";
import type { PersonIdentityProps } from "@persons/person-domain/PersonIdentity/PersonIdentity.types";
import styles from "@persons/person-domain/PersonIdentity/PersonIdentity.module.css";

export function PersonIdentity({
    person,
    size = 36,
    showTag = false,
    prominent = false,
    compactName = false,
}: PersonIdentityProps) {
    return (
        <Flex
            as="span"
            inline
            alignItems="center"
            gap={size === 24 ? "2" : "3"}
            className={styles.identity}
        >
            <LoadedAvatar
                size={size}
                name={person.fullName}
                src={
                    person.avatarMediaId
                        ? mediaHref(person.avatarMediaId)
                        : undefined
                }
            />
            <Flex as="span" direction="column" gap="1" className={styles.text}>
                <Text
                    title={person.fullName}
                    className={`${styles.name} ${prominent ? styles.prominent : ""}`}
                >
                    {compactName
                        ? compactPersonName(person.fullName, "family-first")
                        : person.fullName}
                </Text>
                {showTag && (
                    <Text color="secondary" className={styles.tag}>
                        @{person.tag}
                    </Text>
                )}
            </Flex>
        </Flex>
    );
}
