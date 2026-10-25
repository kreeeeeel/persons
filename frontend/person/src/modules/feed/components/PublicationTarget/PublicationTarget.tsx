'use client';

import { useId, useState } from 'react';
import { Box, Button, Dialog, Flex, Icon, Skeleton, Text, TextInput } from '@gravity-ui/uikit';
import { ChevronDown, Magnifier } from '@gravity-ui/icons';
import type { PersonSummary } from '@persons/person-client';
import { PersonIdentity } from '@persons/person-domain/PersonIdentity';
import { LoadedImage } from '@persons/ui';
import { usePersonSearch } from '@persons/person-domain/hooks/usePersonSearch';
import { useTranslate } from '@persons/i18n';
import searchStyles from '@persons/person-domain/PersonSearch/PersonSearch.module.css';
import dialogStyles from '@persons/person-domain/FormDialog/FormDialog.module.css';
import styles from '@/modules/feed/components/PublicationTarget/PublicationTarget.module.css';

function PageChoices({
    value,
    ownPage,
    onChange,
}: {
    readonly value?: PersonSummary;
    readonly ownPage?: PersonSummary;
    readonly onChange: (page: PersonSummary) => void;
}) {
    const t = useTranslate('feed');
    const person = useTranslate('person');
    const inputId = useId();
    const [query, setQuery] = useState('');
    const search = usePersonSearch(query);
    const results = search.result?.items.filter((page) => page.id !== ownPage?.id) ?? [];
    function choice(page: PersonSummary) {
        return (
            <Button
                key={page.id}
                className={styles.choice}
                view="flat"
                size="xl"
                selected={value?.id === page.id}
                data-selected={value?.id === page.id}
                aria-label={page.fullName}
                onClick={() => onChange(page)}
            >
                <PersonIdentity person={page} size={36} />
            </Button>
        );
    }
    return (
        <Flex direction="column" gap="4">
            {ownPage && choice(ownPage)}
            {ownPage && (
                <Text color="secondary" className={styles.or}>
                    {t('or')}
                </Text>
            )}
            <Box className={searchStyles.root} data-variant="compact">
                <Flex as="label" htmlFor={inputId} alignItems="center" gap="2" className={searchStyles.pill}>
                    <Icon data={Magnifier} size={20} />
                    <TextInput
                        id={inputId}
                        type="search"
                        size="l"
                        view="clear"
                        className={searchStyles.input}
                        value={query}
                        onUpdate={setQuery}
                        hasClear
                        autoComplete="off"
                        placeholder={person('searchCompactPlaceholder')}
                        controlProps={{ 'aria-label': person('searchLabel'), maxLength: 120 }}
                    />
                </Flex>
            </Box>
            {search.loading ? (
                <Flex direction="column" gap="3" role="status" aria-label={person('searching')}>
                    {[0, 1, 2].map((index) => (
                        <Skeleton key={index} className={styles.skeleton} />
                    ))}
                </Flex>
            ) : search.failed ? (
                <Flex direction="column" alignItems="center" gap="3" role="alert" className={styles.empty}>
                    <Text>{person('searchError')}</Text>
                    <Button size="l" onClick={search.retry}>
                        {person('searchRetry')}
                    </Button>
                </Flex>
            ) : search.enabled && results.length ? (
                <Flex direction="column" gap="2" role="group" aria-label={person('searchResults')}>
                    <Text color="secondary" role="status">
                        {person('searchCount', {
                            count: Math.max(
                                0,
                                (search.result?.total ?? 0) -
                                    (search.result?.items.some((page) => page.id === ownPage?.id) ? 1 : 0),
                            ),
                        })}
                    </Text>
                    {results.map((page) => choice(page))}
                </Flex>
            ) : (
                <Flex direction="column" alignItems="center" gap="2" className={styles.empty} role="status">
                    <Box className={styles.art}>
                        <LoadedImage
                            src="/media/search-pages-stepa-v1.webp"
                            alt={t('searchPagesArt')}
                            width={640}
                            height={480}
                            responsive
                        />
                    </Box>
                    <Text as="h3" className={styles.emptyTitle}>
                        {search.enabled ? person('searchEmpty') : t('startTypingTitle')}
                    </Text>
                    <Text color="secondary">
                        {search.enabled ? person('searchEmptyDescription') : t('startTypingDescription')}
                    </Text>
                </Flex>
            )}
        </Flex>
    );
}

export function PublicationTarget({
    value,
    ownPage,
    disabled,
    onChange,
}: {
    readonly value?: PersonSummary;
    readonly ownPage?: PersonSummary;
    readonly disabled?: boolean;
    readonly onChange: (page: PersonSummary) => void;
}) {
    const t = useTranslate('feed');
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button
                size="l"
                view="flat"
                className={styles.trigger}
                disabled={disabled}
                aria-label={t('publicationPage')}
                onClick={() => setOpen(true)}
            >
                {value ? <PersonIdentity person={value} size={24} /> : t('selectPage')}
                <Icon data={ChevronDown} size={16} />
            </Button>
            {open && (
                <Dialog
                    open
                    hasCloseButton
                    maxWidth="s"
                    fullWidth
                    modalClassName={dialogStyles.modal}
                    onClose={() => setOpen(false)}
                    aria-label={t('publicationPage')}
                >
                    <Dialog.Header caption={t('publicationPage')} />
                    <Dialog.Body className={dialogStyles.body}>
                        <PageChoices
                            value={value}
                            ownPage={ownPage}
                            onChange={(page) => {
                                onChange(page);
                                setOpen(false);
                            }}
                        />
                    </Dialog.Body>
                </Dialog>
            )}
        </>
    );
}
