'use client';
import { useLocale } from '@persons/i18n';
import { Button, Flex, Skeleton, Text } from '@gravity-ui/uikit';
import styles from '@/shared/ui/MetricSummary/MetricSummary.module.css';

export function MetricSummary({
    items,
}: {
    readonly items: {
        key: string;
        label: string;
        count?: number;
        selected?: boolean;
        onClick?: () => void;
        hint?: string;
    }[];
}) {
    const locale = useLocale();
    return (
        <Flex wrap gap="4" className={styles.metrics}>
            {items.map((item) => {
                const content = (
                    <Flex
                        direction="column"
                        alignItems="center"
                        justifyContent="center"
                        gap="2"
                        className={styles.content}
                    >
                        {item.count === undefined ? (
                            <Skeleton className={styles.skeleton} />
                        ) : (
                            <Text variant="header-2" color="primary" className={styles.number}>
                                {item.count.toLocaleString(locale)}
                            </Text>
                        )}
                        <Text color="secondary">{item.label}</Text>
                        {item.hint && (
                            <Text color="secondary" className={styles.hint}>
                                {item.hint}
                            </Text>
                        )}
                    </Flex>
                );
                return item.onClick ? (
                    <Button
                        key={item.key}
                        view="flat"
                        className={styles.metric}
                        selected={item.selected}
                        onClick={item.onClick}
                        aria-pressed={Boolean(item.selected)}
                    >
                        {content}
                    </Button>
                ) : (
                    <Flex key={item.key} alignItems="center" justifyContent="center" className={styles.metric}>
                        {content}
                    </Flex>
                );
            })}
        </Flex>
    );
}
