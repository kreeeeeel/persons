'use client';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslate } from '@persons/i18n';
import { Box, Flex, Icon, Text } from '@gravity-ui/uikit';
import { AppLink } from '@persons/ui/AppLink';
import { Persons, Person, ShieldCheck, Medal, Gear, FileText, PersonXmark } from '@gravity-ui/icons';
import styles from '@/modules/person/components/AdminNavigation/AdminNavigation.module.css';

const GROUPS = [
    {
        key: 'community',
        items: [
            { key: 'users', icon: Persons, suffix: '' },
            { key: 'persons', icon: Person, suffix: '/persons' },
            { key: 'blocked', icon: PersonXmark, suffix: '/blocked' },
        ],
    },
    {
        key: 'contentSection',
        items: [
            { key: 'allContent', icon: FileText, suffix: '/content' },
            { key: 'moderation', icon: ShieldCheck, suffix: '/moderation' },
            { key: 'achievements', icon: Medal, suffix: '/achievements' },
        ],
    },
    {
        key: 'settingsSection',
        items: [
            { key: 'variables', icon: Gear, suffix: '/settings' },
            { key: 'tagDictionary', icon: FileText, suffix: '/tag-dictionary' },
        ],
    },
] as const;

export function AdminNavigation({ onNavigate }: { readonly onNavigate?: () => void }) {
    const locale = useLocale();
    const t = useTranslate('person');
    const cms = useTranslate('cms');
    const path = usePathname() ?? '/';
    return (
        <Box as="nav" className={styles.navigation} aria-label={t('adminNavigation')}>
            {GROUPS.map((group) => (
                <Flex
                    direction="column"
                    key={group.key}
                    className={styles.group}
                    role="group"
                    aria-label={cms(group.key)}
                >
                    <Text color="secondary" className={styles.section}>
                        {cms(group.key)}
                    </Text>
                    {group.items.map((item) => (
                        <AppLink
                            key={item.key}
                            href={`/${locale}${item.suffix}`}
                            className={styles.link}
                            onClick={onNavigate}
                            aria-current={
                                path === `/${locale}${item.suffix}` ||
                                Boolean(item.suffix && path.startsWith(`/${locale}${item.suffix}/`))
                                    ? 'page'
                                    : undefined
                            }
                        >
                            <Icon data={item.icon} size={20} />
                            <Text>
                                {item.key === 'variables'
                                    ? cms('variables')
                                    : item.key === 'blocked'
                                      ? cms('blocked')
                                      : t(item.key)}
                            </Text>
                        </AppLink>
                    ))}
                </Flex>
            ))}
        </Box>
    );
}
