'use client';

import { useState } from 'react';
import { Dialog, Flex, TextArea } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import type { PersonSummary } from '@persons/person-client';
import { personClient } from '@persons/person-domain/api/browser';
import { PersonPicker } from '@persons/person-domain/PersonPicker';
import { usePersonMutation } from '@persons/person-domain/hooks/usePersonMutation';
import { MutationFeedback } from '@persons/person-domain/MutationFeedback';
import dialogStyles from '@persons/person-domain/FormDialog/FormDialog.module.css';
import type { GrantDialogProps } from '@/modules/achievements/components/GrantDialog/GrantDialog.types';

export function GrantDialog({ achievement, onClose, onGranted }: GrantDialogProps) {
    const t = useTranslate('person');
    const [people, setPeople] = useState<PersonSummary[]>([]);
    const [note, setNote] = useState('');
    const mutation = usePersonMutation();
    return (
        <Dialog
            open
            modalClassName={dialogStyles.modal}
            fullWidth
            contentOverflow="auto"
            onClose={() => {
                if (!mutation.pending) {
                    onClose();
                }
            }}
        >
            <Dialog.Header caption={`${t('grantAchievement')} · ${achievement.title}`} />
            <Dialog.Body className={dialogStyles.body}>
                <Flex direction="column" gap="4">
                    <MutationFeedback {...mutation} />
                    <PersonPicker
                        value={people}
                        onChange={setPeople}
                        label={t('achievementRecipients')}
                        limit={100}
                        disabled={mutation.pending}
                    />
                    <TextArea
                        size="xl"
                        value={note}
                        onUpdate={setNote}
                        minRows={3}
                        placeholder={t('achievementNote')}
                        disabled={mutation.pending}
                        controlProps={{ 'aria-label': t('achievementNote'), maxLength: 500 }}
                    />
                </Flex>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t('cancel')}
                onClickButtonCancel={onClose}
                textButtonApply={t('grantAchievement')}
                loading={mutation.pending}
                propsButtonApply={{ disabled: !people.length }}
                onClickButtonApply={() =>
                    mutation.run(
                        async () => {
                            const result = await personClient.achievements.grantAchievement({
                                id: achievement.id,
                                achievementGrantInput: { personIds: new Set(people.map(({ id }) => id)), note },
                            });
                            onGranted(result.granted);
                        },
                        undefined,
                        false,
                    )
                }
            />
        </Dialog>
    );
}
