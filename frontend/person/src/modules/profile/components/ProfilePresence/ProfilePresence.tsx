'use client';

import { CircleQuestion, Comments } from '@gravity-ui/icons';
import { Flex, Icon, Text } from '@gravity-ui/uikit';
import { useLocale, useTranslate } from '@persons/i18n';
import type { PersonPresence } from '@persons/person-client';
import styles from '@/modules/profile/components/ProfilePresence/ProfilePresence.module.css';

export function ProfilePresence({ presence }: { readonly presence: PersonPresence }) {
    const t = useTranslate('person');
    const locale = useLocale();
    if (!presence.status || !presence.since) {
        return null;
    }
    const missing = presence.status === 'MISSING';
    const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(presence.since);
    return (
        <Flex
            direction="column"
            gap="2"
            className={styles.root}
            role="region"
            aria-label={t(missing ? 'presenceMissing' : 'presenceUnresponsive')}
        >
            <Flex alignItems="center" gap="2">
                <Icon data={missing ? CircleQuestion : Comments} size={24} />
                <Text variant="subheader-2">{t(missing ? 'presenceMissing' : 'presenceUnresponsive')}</Text>
            </Flex>
            <Text color="secondary">{t(missing ? 'presenceMissingSince' : 'presenceUnresponsiveSince', { date })}</Text>
        </Flex>
    );
}
