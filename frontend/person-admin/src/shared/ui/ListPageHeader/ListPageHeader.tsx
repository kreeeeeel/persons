'use client';
import { usePathname } from 'next/navigation';
import { useTranslate } from '@persons/i18n';
import type { ReactNode } from 'react';
import { Flex, Label, Text } from '@gravity-ui/uikit';
import styles from '@/shared/ui/ListPageHeader/ListPageHeader.module.css';

export function ListPageHeader({
    title,
    description,
    total,
    action,
}: {
    readonly title: string;
    readonly description: string;
    readonly total?: number;
    readonly action?: ReactNode;
}) {
    const path = usePathname() ?? '';
    const t = useTranslate('cms');
    const section = path.includes('/settings')
        ? 'settingsSection'
        : /\/(content|moderation|achievements)/.test(path)
          ? 'contentSection'
          : 'community';
    return (
        <Flex alignItems="flex-start" justifyContent="space-between" gap="4" wrap>
            <Flex direction="column" gap="2" className={styles.heading}>
                <Text color="secondary" className={styles.section}>
                    {t(section)}
                </Text>
                <Flex alignItems="center" gap="3" wrap>
                    <Text as="h1" variant="display-2" className={styles.title}>
                        {title}
                    </Text>
                    {total !== undefined && (
                        <Label size="m" theme="unknown">
                            {total}
                        </Label>
                    )}
                </Flex>
                <Text color="secondary" variant="body-2" className={styles.description}>
                    {description}
                </Text>
            </Flex>
            {action}
        </Flex>
    );
}
