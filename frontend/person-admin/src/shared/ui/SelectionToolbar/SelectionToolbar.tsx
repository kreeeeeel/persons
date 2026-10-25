'use client';

import type { ReactNode } from 'react';
import { Button, Flex, Text } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';

export function SelectionToolbar({
    count,
    total,
    onSelectAll,
    onClear,
    children,
}: {
    readonly count: number;
    readonly total: number;
    readonly onSelectAll: () => void;
    readonly onClear: () => void;
    readonly children: ReactNode;
}) {
    const t = useTranslate('cms');
    const moderation = useTranslate('moderation');
    return (
        <Flex alignItems="center" gap="2" wrap>
            <Button view="flat" onClick={onSelectAll}>
                {t('selectAll')}
            </Button>
            <Button view="flat" disabled={!count} onClick={onClear}>
                {t('clearSelection')}
            </Button>
            <Text color="secondary" aria-hidden>
                ·
            </Text>
            {children}
            <Text color="secondary">
                {count ? t('selected', { count }) : moderation('resultCount', { count: total })}
            </Text>
        </Flex>
    );
}
