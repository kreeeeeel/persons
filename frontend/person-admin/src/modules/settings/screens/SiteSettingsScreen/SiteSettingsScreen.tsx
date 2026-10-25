'use client';

import { useCallback, useState } from 'react';
import { Alert, Button, Flex, Switch, Text } from '@gravity-ui/uikit';
import type { SiteSettings } from '@persons/person-client';
import { useTranslate } from '@persons/i18n';
import { personClient } from '@persons/person-domain/api/browser';
import { usePersonData } from '@persons/person-domain/hooks/usePersonData';
import { usePersonMutation } from '@persons/person-domain/hooks/usePersonMutation';
import { FeedContent } from '@persons/person-domain/FeedContent';
import { MutationFeedback } from '@persons/person-domain/MutationFeedback';
import { ListPageHeader } from '@/shared/ui/ListPageHeader/ListPageHeader';
import styles from '@/modules/settings/screens/SiteSettingsScreen/SiteSettingsScreen.module.css';

export function SiteSettingsScreen() {
    const t = useTranslate('person');
    const cms = useTranslate('cms');
    const common = useTranslate('common');
    const moderation = useTranslate('moderation');
    const load = useCallback((signal: AbortSignal) => personClient.siteSettings.getAdminSiteSettings({ signal }), []);
    const resource = usePersonData('site-settings', load);
    const mutation = usePersonMutation();
    const [draft, setDraft] = useState<SiteSettings>();
    const [saved, setSaved] = useState(false);
    const input = draft ?? resource.data;
    const dirty = input && resource.data && input.marqueeEnabled !== resource.data.marqueeEnabled;

    return (
        <Flex direction="column" gap="5">
            <ListPageHeader
                title={t('siteSettings')}
                description={cms('siteSettingsDescription')}
                action={
                    <Button
                        size="l"
                        view="outlined"
                        loading={resource.refreshing}
                        disabled={mutation.pending}
                        onClick={() => {
                            setDraft(undefined);
                            setSaved(false);
                            resource.refresh();
                        }}
                    >
                        {moderation('refresh')}
                    </Button>
                }
            />
            <MutationFeedback {...mutation} />
            {saved && <Alert theme="success" message={t('settingsSaved')} />}
            <FeedContent
                loading={resource.loading}
                error={resource.error}
                empty={false}
                emptyTitle=""
                emptyDescription=""
                onRetry={resource.refresh}
            >
                {input && (
                    <Flex
                        as="form"
                        direction="column"
                        gap="4"
                        className={styles.form}
                        onSubmit={(event) => {
                            event.preventDefault();
                            setSaved(false);
                            mutation.run(
                                () => personClient.siteSettings.updateSiteSettings({ siteSettings: input }),
                                (updated) => {
                                    setDraft(updated);
                                    setSaved(true);
                                    resource.refresh();
                                },
                                false,
                            );
                        }}
                    >
                        <Flex alignItems="center" justifyContent="space-between" gap="4" className={styles.card}>
                            <Flex direction="column" gap="2">
                                <Text variant="subheader-2">{cms('marqueeEnabled')}</Text>
                                <Text color="secondary">{cms('marqueeEnabledHint')}</Text>
                            </Flex>
                            <Switch
                                size="l"
                                checked={input.marqueeEnabled}
                                disabled={mutation.pending || resource.refreshing}
                                controlProps={{ 'aria-label': cms('marqueeEnabled') }}
                                onUpdate={(marqueeEnabled) => {
                                    setSaved(false);
                                    setDraft({ ...input, marqueeEnabled });
                                }}
                            />
                        </Flex>
                        <Text color="secondary">{cms('siteSettingsHint')}</Text>
                        <Flex>
                            <Button
                                type="submit"
                                view="action"
                                size="l"
                                loading={mutation.pending}
                                disabled={!dirty || resource.refreshing}
                            >
                                {common('save')}
                            </Button>
                        </Flex>
                    </Flex>
                )}
            </FeedContent>
        </Flex>
    );
}
