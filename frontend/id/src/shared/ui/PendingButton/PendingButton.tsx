'use client';

import { Button, Flex, Spin } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import styles from '@/shared/ui/PendingButton/PendingButton.module.css';

export function PendingButton({
    children,
    pending,
    disabled,
}: {
    readonly children: string;
    readonly pending: boolean;
    readonly disabled?: boolean;
}) {
    const t = useTranslate('common');

    return (
        <Button
            type="submit"
            view="action"
            size="xl"
            width="max"
            disabled={pending || disabled}
            aria-busy={pending}
            aria-label={pending ? t('loading') : children}
            className={styles.button}
        >
            {pending ? (
                <Flex
                    alignItems="center"
                    justifyContent="center"
                    className={styles.progress}
                    role="status"
                    aria-label={t('loading')}
                >
                    <Spin size="s" className={styles.spinner} />
                </Flex>
            ) : (
                children
            )}
        </Button>
    );
}
