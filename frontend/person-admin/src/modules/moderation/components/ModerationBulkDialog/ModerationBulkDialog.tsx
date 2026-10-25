'use client';

import { useId, useState } from 'react';
import { Alert, Dialog, Flex, Text, TextArea } from '@gravity-ui/uikit';
import type { Decision, ModerationItem } from '@persons/person-client';
import { useTranslate } from '@persons/i18n';
import { personClient } from '@persons/person-domain/api/browser';

export interface ModerationBulkResult {
    readonly success: string[];
    readonly failed: string[];
}

export function ModerationBulkDialog({
    items,
    decision,
    onComplete,
    onClose,
}: {
    readonly items: ModerationItem[];
    readonly decision: Decision;
    readonly onComplete: (result: ModerationBulkResult) => void;
    readonly onClose: () => void;
}) {
    const t = useTranslate('moderation');
    const reasonId = useId();
    const [reason, setReason] = useState('');
    const [error, setError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [completed, setCompleted] = useState(0);
    async function submit() {
        if (busy) {
            return;
        }
        if (decision === 'REJECT' && !reason.trim()) {
            setError(true);
            return;
        }
        setBusy(true);
        const result: ModerationBulkResult = { success: [], failed: [] };
        for (const item of items) {
            try {
                await personClient.admin.decideModeration({
                    id: item.id,
                    decisionInput: { decision, reason: reason.trim() || undefined },
                });
                result.success.push(item.id);
            } catch {
                result.failed.push(item.id);
            }
            setCompleted(result.success.length + result.failed.length);
        }
        setBusy(false);
        onComplete(result);
    }
    return (
        <Dialog
            open
            hasCloseButton
            fullWidth
            maxWidth="m"
            contentOverflow="auto"
            aria-label={t('bulkTitle', { count: items.length })}
            disableOutsideClick={busy}
            disableEscapeKeyDown={busy}
            onClose={() => {
                if (!busy) {
                    onClose();
                }
            }}
        >
            <Dialog.Header caption={t('bulkTitle', { count: items.length })} />
            <Dialog.Body>
                <Flex direction="column" gap="4">
                    <Text color="secondary">{t('bulkHint')}</Text>
                    {items.map((item) => (
                        <Flex key={item.id} direction="column" gap="1">
                            <Text variant="subheader-1">{item.personName || `@${item.personTag}`}</Text>
                            <Text color="secondary">
                                {item.authorName} · {item.summary}
                            </Text>
                        </Flex>
                    ))}
                    <Text as="label" htmlFor={reasonId}>
                        {t('reason')}
                    </Text>
                    <TextArea
                        id={reasonId}
                        value={reason}
                        onUpdate={setReason}
                        minRows={2}
                        disabled={busy}
                        controlProps={{ maxLength: 1000, 'aria-label': t('reason') }}
                    />
                    <Text color="secondary">{t('reasonHint')}</Text>
                    {error && <Alert theme="danger" align="center" message={t('reasonRequired')} />}
                    {busy && (
                        <Text role="status">
                            {completed} / {items.length}
                        </Text>
                    )}
                </Flex>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t('close')}
                onClickButtonCancel={onClose}
                propsButtonCancel={{ disabled: busy }}
                textButtonApply={t(decision === 'APPROVE' ? 'approveSelected' : 'rejectSelected')}
                loading={busy}
                onClickButtonApply={() => void submit()}
                preset={decision === 'REJECT' ? 'danger' : 'success'}
            />
        </Dialog>
    );
}
