'use client';

import { useId, useState } from 'react';
import { Alert, Dialog, Flex, Text, TextArea } from '@gravity-ui/uikit';
import type { AdminContentItem } from '@persons/person-client';
import { useTranslate } from '@persons/i18n';
import { personClient, personError } from '@persons/person-domain/api/browser';
import { bulkEligible, contentKey } from '@/modules/content/model/selection';
import type { ContentBulkAction } from '@/modules/content/model/selection';
import type { ContentBulkResult } from '@/modules/content/components/ContentBulkDialog/ContentBulkDialog.types';

export function ContentBulkDialog({
    items,
    action,
    onComplete,
    onClose,
}: {
    readonly items: AdminContentItem[];
    readonly action: ContentBulkAction;
    readonly onComplete: (result: ContentBulkResult) => void;
    readonly onClose: () => void;
}) {
    const t = useTranslate('content');
    const cms = useTranslate('cms');
    const id = useId();
    const [reason, setReason] = useState('');
    const [error, setError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [completed, setCompleted] = useState(0);
    const targets = items.filter((item) => bulkEligible(item, action));
    async function submit() {
        if (busy || !targets.length) {
            return;
        }
        if (action !== 'APPROVE' && !reason.trim()) {
            setError(true);
            return;
        }
        setError(false);
        setBusy(true);
        const result: ContentBulkResult = { success: [], failures: [] };
        // Remove child materials before a selected page can hide its contents.
        const ordered = [...targets].sort(
            (first, second) => Number(first.kind === 'PERSON') - Number(second.kind === 'PERSON'),
        );
        for (const item of ordered) {
            try {
                if (action === 'REMOVE') {
                    await personClient.contentAdmin.hideAdminContent({
                        kind: item.kind,
                        id: item.id,
                        contentHideInput: { reason: reason.trim() },
                    });
                } else if (item.pendingRequestId) {
                    await personClient.admin.decideModeration({
                        id: item.pendingRequestId,
                        decisionInput: { decision: action, reason: reason.trim() || undefined },
                    });
                }
                result.success.push(contentKey(item));
            } catch (failure) {
                result.failures.push({ key: contentKey(item), code: await personError(failure) });
            }
            setCompleted(result.success.length + result.failures.length);
        }
        setBusy(false);
        onComplete(result);
    }
    const caption = cms(action === 'REMOVE' ? 'bulkRemoveTitle' : 'bulkContentTitle', { count: targets.length });
    return (
        <Dialog
            open
            hasCloseButton
            fullWidth
            maxWidth="m"
            contentOverflow="auto"
            aria-label={caption}
            disableOutsideClick={busy}
            disableEscapeKeyDown={busy}
            onClose={() => {
                if (!busy) {
                    onClose();
                }
            }}
        >
            <Dialog.Header caption={caption} />
            <Dialog.Body>
                <Flex direction="column" gap="4">
                    <Text color="secondary">{action === 'REMOVE' ? cms('bulkRemoveHint') : t('bulkHint')}</Text>
                    {targets.map((item) => (
                        <Flex key={contentKey(item)} direction="column" gap="1">
                            <Text variant="subheader-1">
                                {item.personName} · @{item.personTag}
                            </Text>
                            <Text color="secondary">
                                {t(item.kind)} · {item.text || t('noText')}
                            </Text>
                        </Flex>
                    ))}
                    <Text as="label" htmlFor={id}>
                        {t(action === 'REMOVE' ? 'reason' : 'reasonHintTitle')}
                    </Text>
                    <TextArea
                        id={id}
                        value={reason}
                        onUpdate={setReason}
                        minRows={2}
                        disabled={busy}
                        controlProps={{
                            maxLength: 1000,
                            'aria-label': t(action === 'REMOVE' ? 'reason' : 'reasonHintTitle'),
                        }}
                    />
                    {error && (
                        <Alert
                            theme="danger"
                            align="center"
                            message={t(action === 'REMOVE' ? 'reasonRequired' : 'reasonRequiredReview')}
                        />
                    )}
                    {busy && (
                        <Text role="status">
                            {completed} / {targets.length}
                        </Text>
                    )}
                </Flex>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t('close')}
                onClickButtonCancel={onClose}
                propsButtonCancel={{ disabled: busy }}
                textButtonApply={
                    action === 'REMOVE' ? t('confirmHide') : cms(action === 'APPROVE' ? 'approve' : 'reject')
                }
                loading={busy}
                propsButtonApply={{ disabled: !targets.length }}
                onClickButtonApply={() => void submit()}
                preset={action === 'APPROVE' ? 'success' : 'danger'}
            />
        </Dialog>
    );
}
