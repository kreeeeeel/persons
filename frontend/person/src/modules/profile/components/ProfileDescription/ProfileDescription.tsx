'use client';

import { useState } from 'react';
import { Button, Flex, Text } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import styles from '@/modules/profile/components/ProfileDescription/ProfileDescription.module.css';

export function ProfileDescription({ description }: { readonly description: string }) {
    const t = useTranslate('person');
    const details = useTranslate('profileDetails');
    const [expanded, setExpanded] = useState(false);
    return (
        <Flex direction="column" gap="2" className={styles.root}>
            <Text
                as="p"
                className={styles.description}
                data-expanded={expanded}
                color={description ? 'primary' : 'secondary'}
            >
                {description || t('noDescription')}
            </Text>
            {description.length > 360 && (
                <Button
                    size="l"
                    view="flat"
                    className={styles.expand}
                    aria-expanded={expanded}
                    onClick={() => setExpanded((value) => !value)}
                >
                    {details(expanded ? 'collapseDescription' : 'expandDescription')}
                </Button>
            )}
        </Flex>
    );
}
