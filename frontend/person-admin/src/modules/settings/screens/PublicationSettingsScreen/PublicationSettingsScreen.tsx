'use client';

import { useCallback, useState } from 'react';
import { Alert, Button, Flex, Label, Switch, Text } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import type { PublicationSettings } from '@persons/person-client';
import { personClient } from '@persons/person-domain/api/browser';
import { usePersonData } from '@persons/person-domain/hooks/usePersonData';
import { usePersonMutation } from '@persons/person-domain/hooks/usePersonMutation';
import { FeedContent } from '@persons/person-domain/FeedContent';
import { ListPageHeader } from '@/shared/ui/ListPageHeader/ListPageHeader';
import styles from '@/modules/settings/screens/PublicationSettingsScreen/PublicationSettingsScreen.module.css';
import { MutationFeedback } from '@persons/person-domain/MutationFeedback';

const FIELDS = [
    { field: 'commentsRequireModeration', hint: 'commentsPolicyHint' },
    { field: 'reviewsRequireModeration', hint: 'reviewsPolicyHint' },
    { field: 'loansRequireModeration', hint: 'loansPolicyHint' },
    { field: 'photosRequireModeration', hint: 'policyPhotosHint', legacy: true },
    { field: 'momentsRequireModeration', hint: 'policyMomentsHint', legacy: true },
    { field: 'pagesRequireModeration', hint: 'pagesPolicyHint' },
    { field: 'profileChangesRequireModeration', hint: 'profileChangesPolicyHint' },
    { field: 'avatarsRequireModeration', hint: 'avatarsPolicyHint' },
] as const;

export function PublicationSettingsScreen() {
    const t = useTranslate('person');
    const common = useTranslate('common');
    const cms = useTranslate('cms');
    const moderation = useTranslate('moderation');
    const load = useCallback((signal: AbortSignal) => personClient.publication.getPublicationSettings({ signal }), []);
    const resource = usePersonData('publication-settings', load);
    const mutation = usePersonMutation();
    const [draft, setDraft] = useState<PublicationSettings>();
    const [saved, setSaved] = useState(false);
    const input = draft ?? resource.data;
    const dirty =
        input &&
        resource.data &&
        FIELDS.some(({ field }) => (input[field] ?? true) !== (resource.data?.[field] ?? true));

    return (
        <Flex direction="column" gap="5">
            <ListPageHeader
                title={t('publicationSettings')}
                description={moderation('publicationDescription')}
                action={
                    <Button
                        size="l"
                        view="outlined"
                        loading={resource.refreshing}
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
                                () =>
                                    personClient.publication.updatePublicationSettings({ publicationSettings: input }),
                                (updated) => {
                                    setDraft(updated);
                                    setSaved(true);
                                    resource.refresh();
                                },
                                false,
                            );
                        }}
                    >
                        {FIELDS.map((setting) => (
                            <Flex
                                key={setting.field}
                                alignItems="center"
                                justifyContent="space-between"
                                gap="4"
                                className={styles.card}
                            >
                                <Flex direction="column" gap="2" alignItems="flex-start">
                                    <Text variant="subheader-2">{cms(setting.field)}</Text>
                                    <Text color="secondary">
                                        {'legacy' in setting ? moderation(setting.hint) : cms(setting.hint)}
                                    </Text>
                                    <Label theme={(input[setting.field] ?? true) ? 'warning' : 'success'}>
                                        {moderation((input[setting.field] ?? true) ? 'reviewFirst' : 'instant')}
                                    </Label>
                                </Flex>
                                <Switch
                                    size="l"
                                    checked={input[setting.field] ?? true}
                                    disabled={mutation.pending}
                                    onUpdate={(value) => {
                                        setSaved(false);
                                        setDraft({ ...input, [setting.field]: value });
                                    }}
                                    controlProps={{ 'aria-label': cms(setting.field) }}
                                />
                            </Flex>
                        ))}
                        <Alert theme="info" align="center" message={moderation('newContentHint')} />
                        <Text color="secondary">{moderation('forcedHint')}</Text>
                        <Flex>
                            <Button type="submit" view="action" size="l" loading={mutation.pending} disabled={!dirty}>
                                {common('save')}
                            </Button>
                        </Flex>
                    </Flex>
                )}
            </FeedContent>
        </Flex>
    );
}
