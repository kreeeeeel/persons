'use client';

import { useCallback, useState } from 'react';
import { Box, Flex, Icon, Select, Text } from '@gravity-ui/uikit';
import { Funnel } from '@gravity-ui/icons';
import type { SiteSettings } from '@persons/person-client';
import { useLocale, useTranslate } from '@persons/i18n';
import { useSiteSettings } from '@persons/person-domain/settings/useSiteSettings';
import { useInfinitePersonData } from '@persons/person-domain/hooks/useInfinitePersonData';
import { FeedContent } from '@persons/person-domain/FeedContent';
import { InfiniteFeedLoader } from '@persons/person-domain/InfiniteFeedLoader';
import { loadDirectoryPage } from '@/modules/directory/model/loadDirectoryPage';
import type { DirectorySort } from '@/modules/directory/model/DirectorySort';
import { PersonCard } from '@/modules/directory/components/PersonCard/PersonCard';
import styles from '@/modules/directory/screens/DirectoryScreen/DirectoryScreen.module.css';

const ORDERS = ['views', 'popular', 'newest', 'name'] as const;

export function DirectoryScreen({ settings }: { readonly settings?: SiteSettings }) {
    const t = useTranslate('directory');
    const locale = useLocale();
    const [sort, setSort] = useState<DirectorySort>('views');
    const { data } = useSiteSettings(settings);
    const pageSize = data?.catalogPageSize ?? 12;
    const load = useCallback(
        (page: number, signal: AbortSignal) => loadDirectoryPage(page, pageSize, sort, signal),
        [pageSize, sort],
    );
    const resource = useInfinitePersonData(`directory:${pageSize}:${sort}:${locale}`, load);

    return (
        <Box>
            <Flex direction="column" gap="4" className={styles.heading}>
                <Text className={styles.eyebrow}>{t('eyebrow')}</Text>
                <Text as="h1" className={styles.title}>
                    {t('title')}
                </Text>
                <Text as="p" className={styles.intro}>
                    {t('intro')}
                </Text>
            </Flex>
            <Flex direction="column" gap="5">
                <Select
                    className={styles.sort}
                    size="l"
                    view="clear"
                    value={[sort]}
                    aria-label={t('sort')}
                    options={ORDERS.map((value) => ({ value, content: t(value) }))}
                    renderSelectedOption={() => (
                        <Flex alignItems="center" gap="2">
                            <Icon data={Funnel} size={18} />
                            <Text>{t(sort)}</Text>
                        </Flex>
                    )}
                    onUpdate={([value]) => {
                        const next = ORDERS.find((order) => order === value);
                        if (next) {
                            setSort(next);
                        }
                    }}
                />
                <FeedContent
                    loading={resource.loading}
                    error={resource.error}
                    empty={!resource.data?.items.length}
                    emptyTitle={t('emptyTitle')}
                    emptyDescription={t('emptyDescription')}
                    illustration="search"
                    onRetry={resource.refresh}
                >
                    <Box className={styles.grid}>
                        {resource.data?.items.map((person) => (
                            <PersonCard key={person.tag} person={person} />
                        ))}
                    </Box>
                </FeedContent>
                <InfiniteFeedLoader {...resource} />
            </Flex>
        </Box>
    );
}
