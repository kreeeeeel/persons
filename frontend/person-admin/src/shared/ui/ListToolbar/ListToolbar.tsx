import type { ReactNode } from 'react';
import { Flex, Icon, TextInput } from '@gravity-ui/uikit';
import { Magnifier } from '@gravity-ui/icons';
import styles from '@/shared/ui/ListToolbar/ListToolbar.module.css';

export function ListToolbar({
    search,
    onSearch,
    placeholder,
    filters,
    action,
}: {
    readonly search: string;
    readonly onSearch: (value: string) => void;
    readonly placeholder: string;
    readonly filters?: ReactNode;
    readonly action?: ReactNode;
}) {
    return (
        <Flex gap="3" alignItems="center" wrap className={styles.toolbar}>
            <TextInput
                value={search}
                onUpdate={onSearch}
                placeholder={placeholder}
                hasClear
                size="l"
                className={styles.search}
                startContent={
                    <Flex className={styles.icon}>
                        <Icon data={Magnifier} size={18} />
                    </Flex>
                }
                controlProps={{ maxLength: 200, 'aria-label': placeholder }}
            />
            {filters}
            {action}
        </Flex>
    );
}
