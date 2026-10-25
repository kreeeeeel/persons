'use client';
import { LoadErrorContext } from '@persons/ui/loading/LoadErrorContext';

import { useCallback, useState } from 'react';
import { Dialog, Flex, Switch, Text } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import { personClient } from '@persons/person-domain/api/browser';
import { usePersonData } from '@persons/person-domain/hooks/usePersonData';
import { usePersonMutation } from '@persons/person-domain/hooks/usePersonMutation';
import { FeedContent } from '@persons/person-domain/FeedContent';
import { MutationFeedback } from '@persons/person-domain/MutationFeedback';
import type { UserModerationDialogProps } from '@/modules/users/components/UserModerationDialog/UserModerationDialog.types';

export function UserModerationDialog({ userId, name, onClose }: UserModerationDialogProps) {
    const t = useTranslate('person');
    const common = useTranslate('common');
    const load = useCallback(
        (signal: AbortSignal) => personClient.publication.getUserModerationSettings({ id: userId }, { signal }),
        [userId],
    );
    const resource = usePersonData(`user-moderation:${userId}`, load);
    const mutation = usePersonMutation();
    const [draft, setDraft] = useState<boolean>();
    const forceModeration = draft ?? resource.data?.forceModeration ?? false;

    return (
        <Dialog
            open
            maxWidth="m"
            fullWidth
            hasCloseButton
            contentOverflow="auto"
            onClose={() => {
                if (!mutation.pending) {
                    onClose();
                }
            }}
            aria-label={t('userModeration')}
        >
            <Dialog.Header caption={t('userModeration')} />
            <Dialog.Body>
                <LoadErrorContext value="dialog">
                    <Flex direction="column" gap="4">
                        <Text>{name}</Text>
                        <MutationFeedback {...mutation} />
                        <FeedContent
                            loading={resource.loading}
                            error={resource.error}
                            empty={false}
                            emptyTitle=""
                            emptyDescription=""
                            onRetry={resource.refresh}
                        >
                            <Switch size="l" checked={forceModeration} disabled={mutation.pending} onUpdate={setDraft}>
                                {t('forceUserModeration')}
                            </Switch>
                            <Text color="secondary">{t('forcedModerationPriority')}</Text>
                        </FeedContent>
                    </Flex>
                </LoadErrorContext>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t('cancel')}
                textButtonApply={common('save')}
                onClickButtonCancel={onClose}
                loading={mutation.pending}
                propsButtonCancel={{ disabled: mutation.pending }}
                propsButtonApply={{
                    disabled: resource.loading || !resource.data || !!resource.error || mutation.pending,
                }}
                onClickButtonApply={() =>
                    mutation.run(
                        () =>
                            personClient.publication.updateUserModerationSettings({
                                id: userId,
                                userModerationSettings: { forceModeration },
                            }),
                        onClose,
                        false,
                    )
                }
            />
        </Dialog>
    );
}
