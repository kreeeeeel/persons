import { Flex, Link, Text } from '@gravity-ui/uikit';
import { LoadedAvatar } from '@persons/ui';
import styles from '@/shared/ui/IdentityCell/IdentityCell.module.css';

export interface IdentityCellProps {
    readonly name: string;
    readonly tag?: string;
    readonly avatar?: string;
    readonly href?: string;
}

export function IdentityCell({ name, tag, avatar, href }: IdentityCellProps) {
    return (
        <Flex alignItems="center" gap="3" className={styles.identity}>
            <LoadedAvatar name={name} src={avatar} size={40} />
            <Flex direction="column" gap="1" className={styles.text}>
                {href ? (
                    <Link href={href} target="_blank" rel="noopener noreferrer" className={styles.name}>
                        {name}
                    </Link>
                ) : (
                    <Text className={styles.name}>{name}</Text>
                )}
                {tag && (
                    <Text color="secondary" className={styles.tag}>
                        @{tag}
                    </Text>
                )}
            </Flex>
        </Flex>
    );
}
