'use client';

import { Avatar, Card, Flex, Icon, Text } from '@gravity-ui/uikit';
import { ArrowUpRight, Eye, Picture, Play, Star } from '@gravity-ui/icons';
import { useLocale, useTranslate } from '@persons/i18n';
import { AppLink } from '@persons/ui/AppLink';
import type { DirectoryEntry } from '@persons/person-client';
import { mediaHref } from '@persons/person-domain/api/browser';
import styles from '@/modules/directory/components/PersonCard/PersonCard.module.css';

export function PersonCard({ person }: { readonly person: DirectoryEntry }) {
    const locale = useLocale();
    const t = useTranslate('directory');
    const name = person.fullName;
    const format = new Intl.NumberFormat(locale);

    return (
        <AppLink href={`/${locale}/person/${person.tag}`} className={styles.link} aria-label={t('open', { name })}>
            <Card view="filled" className={styles.card}>
                <Flex alignItems="center" gap="3">
                    <Avatar
                        text={name}
                        imgUrl={person.avatarMediaId ? mediaHref(person.avatarMediaId) : undefined}
                        size="xl"
                        theme="brand"
                    />
                    <Flex direction="column" gap="1" className={styles.identity}>
                        <Text as="h2" className={styles.name}>
                            {name}
                        </Text>
                        <Text color="secondary" className={styles.tag}>{`@${person.tag}`}</Text>
                    </Flex>
                    <Flex className={styles.open} aria-hidden="true">
                        <Icon data={ArrowUpRight} size={20} />
                    </Flex>
                </Flex>
                <Flex gap="4" className={styles.stats}>
                    {[
                        { icon: Eye, label: 'viewCount', value: format.format(person.views) },
                        { icon: Picture, label: 'photoCount', value: format.format(person.photos) },
                        { icon: Play, label: 'momentCount', value: format.format(person.moments) },
                        {
                            icon: Star,
                            label: 'ratingValue',
                            value: person.ratingAverage === undefined ? '—' : format.format(person.ratingAverage),
                        },
                    ].map(({ icon, label, value }) => (
                        <Flex key={label} alignItems="center" gap="1" aria-label={t(label, { count: value })}>
                            <Icon data={icon} size={17} />
                            <Text>{value}</Text>
                        </Flex>
                    ))}
                </Flex>
            </Card>
        </AppLink>
    );
}
