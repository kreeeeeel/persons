'use client';

import { useCallback, useContext, useState } from 'react';
import { Alert, Button, Flex, Text, TextArea } from '@gravity-ui/uikit';
import { LabeledTextInput } from '@persons/ui/LabeledTextInput';
import { useTranslate } from '@persons/i18n';
import type { TagDefinition } from '@persons/person-client';
import { personClient, personError } from '@persons/person-domain/api/browser';
import { usePersonData } from '@persons/person-domain/hooks/usePersonData';
import { FeedContent } from '@persons/person-domain/FeedContent';
import { TagDictionaryContext } from '@persons/person-domain/tags/TagDictionaryContext';
import { ListPageHeader } from '@/shared/ui/ListPageHeader/ListPageHeader';
import styles from '@/modules/settings/screens/TagDictionaryScreen/TagDictionaryScreen.module.css';

type DraftDefinition = TagDefinition & { readonly key: string };

export function TagDictionaryScreen() {
    const t = useTranslate('person');
    const dictionary = useContext(TagDictionaryContext);
    const load = useCallback((signal: AbortSignal) => personClient.tags.listTagDefinitions({ signal }), []);
    const resource = usePersonData('admin-tag-dictionary', load);
    const [draft, setDraft] = useState<DraftDefinition[]>();
    const [pending, setPending] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string>();
    const rows = draft ?? resource.data?.map((item, index) => ({ ...item, key: `saved:${index}` })) ?? [];

    function change(next: DraftDefinition[]) {
        setDraft(next);
        setSaved(false);
        setError(undefined);
    }

    async function save() {
        setPending(true);
        setError(undefined);
        try {
            const result = await personClient.tags.updateTagDefinitions({
                tagDefinition: rows.map(({ tag, descriptions }) => ({
                    tag: tag.trim().replace(/^#/, ''),
                    descriptions: Object.fromEntries(Object.entries(descriptions).filter(([, value]) => value.trim())),
                })),
            });
            setDraft(result.map((item) => ({ ...item, key: crypto.randomUUID() })));
            setSaved(true);
            dictionary.refresh?.();
        } catch (failure) {
            setError(await personError(failure));
        } finally {
            setPending(false);
        }
    }

    return (
        <Flex direction="column" gap="5">
            <ListPageHeader
                title={t('tagDictionary')}
                description={t('tagDictionaryHint')}
                action={
                    <Button
                        size="l"
                        view="action"
                        disabled={!draft || pending || saved}
                        loading={pending}
                        onClick={save}
                    >
                        {t('saveDirect')}
                    </Button>
                }
            />
            {error && (
                <Flex role="alert">
                    <Alert theme="danger" message={t(error)} />
                </Flex>
            )}
            {saved && <Alert theme="success" message={t('dictionarySaved')} />}
            <FeedContent
                loading={resource.loading}
                error={resource.error}
                empty={false}
                emptyTitle=""
                emptyDescription=""
                onRetry={resource.refresh}
            >
                <Flex direction="column" gap="4">
                    {!rows.length && <Text color="secondary">{t('dictionaryEmpty')}</Text>}
                    {rows.map((row) => (
                        <Flex key={row.key} direction="column" gap="3" className={styles.entry}>
                            <Flex alignItems="center" gap="3">
                                <LabeledTextInput
                                    size="l"
                                    label={t('dictionaryTag')}
                                    value={row.tag}
                                    disabled={pending}
                                    controlProps={{ maxLength: 33, 'aria-label': t('dictionaryTag') }}
                                    onUpdate={(tag) =>
                                        change(rows.map((item) => (item.key === row.key ? { ...item, tag } : item)))
                                    }
                                />
                                <Button
                                    view="flat-danger"
                                    size="l"
                                    disabled={pending}
                                    onClick={() => change(rows.filter((item) => item.key !== row.key))}
                                >
                                    {t('remove')}
                                </Button>
                            </Flex>
                            {(['ru', 'en'] as const).map((locale) => (
                                <TextArea
                                    key={locale}
                                    size="l"
                                    placeholder={t(locale === 'ru' ? 'dictionaryRussian' : 'dictionaryEnglish')}
                                    value={row.descriptions[locale] ?? ''}
                                    disabled={pending}
                                    minRows={2}
                                    controlProps={{
                                        maxLength: 500,
                                        'aria-label': t(locale === 'ru' ? 'dictionaryRussian' : 'dictionaryEnglish'),
                                    }}
                                    onUpdate={(value) =>
                                        change(
                                            rows.map((item) =>
                                                item.key === row.key
                                                    ? {
                                                          ...item,
                                                          descriptions: { ...item.descriptions, [locale]: value },
                                                      }
                                                    : item,
                                            ),
                                        )
                                    }
                                />
                            ))}
                        </Flex>
                    ))}
                    <Button
                        size="l"
                        view="outlined"
                        disabled={pending || rows.length >= 200 || resource.loading}
                        onClick={() =>
                            change([...rows, { key: crypto.randomUUID(), tag: '', descriptions: { ru: '', en: '' } }])
                        }
                    >
                        {t('dictionaryAdd')}
                    </Button>
                </Flex>
            </FeedContent>
        </Flex>
    );
}
