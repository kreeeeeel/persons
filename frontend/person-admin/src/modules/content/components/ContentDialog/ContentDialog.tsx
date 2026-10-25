'use client';

import { useId, useState } from 'react';
import { Alert, Button, Dialog, Flex, Label, Link, Text, TextArea } from '@gravity-ui/uikit';
import { LoadedImage } from '@persons/ui';
import type { AdminContentItem } from '@persons/person-client';
import { useLocale, useTranslate } from '@persons/i18n';
import { mediaHref, personClient, personError } from '@persons/person-domain/api/browser';
import { MediaVideoPlayer } from '@persons/person-domain/media/MediaVideoPlayer';
import { contentDestination } from '@/modules/content/model/destination';
import { PendingContentReview } from '@/modules/content/components/PendingContentReview/PendingContentReview';
import styles from '@/modules/content/components/ContentDialog/ContentDialog.module.css';

export function ContentDialog({
    item,
    publicUrl,
    onClose,
    onSaved,
}: {
    readonly item: AdminContentItem;
    readonly publicUrl: string;
    readonly onClose: () => void;
    readonly onSaved: () => void;
}) {
    const t = useTranslate('content');
    const person = useTranslate('person');
    const locale = useLocale();
    const [mode, setMode] = useState<'view' | 'hide' | 'review'>('view');
    const reasonId = useId();
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();
    async function hide() {
        if (!reason.trim()) {
            setError(t('reasonRequired'));
            return;
        }
        setBusy(true);
        setError(undefined);
        try {
            await personClient.contentAdmin.hideAdminContent({
                kind: item.kind,
                id: item.id,
                contentHideInput: { reason: reason.trim() },
            });
            onSaved();
        } catch (failure) {
            setError(person(await personError(failure)));
        } finally {
            setBusy(false);
        }
    }
    return (
        <Dialog
            open
            hasCloseButton
            fullWidth
            maxWidth="l"
            contentOverflow="auto"
            aria-label={t('detailTitle')}
            disableOutsideClick={busy}
            disableEscapeKeyDown={busy}
            onClose={() => {
                if (!busy) {
                    onClose();
                }
            }}
        >
            <Dialog.Header
                caption={t(mode === 'hide' ? 'hideTitle' : mode === 'review' ? 'reviewTitle' : 'detailTitle')}
            />
            <Dialog.Body>
                {mode === 'review' && item.pendingRequestId ? (
                    <PendingContentReview
                        id={item.pendingRequestId}
                        publicUrl={publicUrl}
                        onSaved={onSaved}
                        onBusy={setBusy}
                    />
                ) : (
                    <Flex direction="column" gap="4">
                        <Flex gap="2" wrap alignItems="center">
                            <Label>{t(item.kind)}</Label>
                            <Label theme={item.status === 'PUBLISHED' ? 'success' : 'normal'}>{t(item.status)}</Label>
                        </Flex>
                        <Flex direction="column" gap="2">
                            <Text color="secondary">{t('destination')}</Text>
                            <Link
                                href={contentDestination(item, publicUrl, locale)}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {item.personName} · @{item.personTag}
                            </Link>
                            <Text>{t(`section${item.kind}`)}</Text>
                        </Flex>
                        <Text color="secondary">
                            {item.authorName || '—'} ·{' '}
                            {new Intl.DateTimeFormat(locale, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                                timeZone: 'Europe/Moscow',
                            }).format(item.createdAt)}
                        </Text>
                        <Text className={styles.text}>{item.text || t('noText')}</Text>
                        {item.status === 'HIDDEN' && <Alert theme="info" align="center" message={t('hiddenHint')} />}
                        {item.mediaId &&
                            (!item.mediaAvailable ? (
                                <Alert align="center" theme="warning" message={t('mediaUnavailable')} />
                            ) : item.kind === 'MOMENT' ? (
                                <MediaVideoPlayer
                                    id={item.mediaId}
                                    title={item.text || t('MOMENT')}
                                    poster={
                                        item.previewAvailable
                                            ? `/api/person/v1/media/${item.mediaId}/preview`
                                            : undefined
                                    }
                                />
                            ) : (
                                <LoadedImage
                                    responsive
                                    src={mediaHref(item.mediaId)}
                                    width={1200}
                                    height={900}
                                    alt={item.text || t(item.kind)}
                                />
                            ))}
                        {mode === 'hide' && (
                            <>
                                <Alert theme="warning" align="center" message={t('hideHint')} />
                                <Text as="label" htmlFor={reasonId}>
                                    {t('reason')}
                                </Text>
                                <TextArea
                                    id={reasonId}
                                    value={reason}
                                    onUpdate={setReason}
                                    disabled={busy}
                                    controlProps={{ 'aria-label': t('reason'), maxLength: 1000 }}
                                />
                            </>
                        )}
                        {error && <Alert align="center" theme="danger" message={error} />}
                    </Flex>
                )}
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t('close')}
                onClickButtonCancel={onClose}
                propsButtonCancel={{ disabled: busy }}
            >
                <Flex gap="2" wrap>
                    {mode !== 'view' && (
                        <Button
                            size="l"
                            disabled={busy}
                            onClick={() => {
                                setMode('view');
                                setError(undefined);
                            }}
                        >
                            {t('backToContent')}
                        </Button>
                    )}
                    {mode === 'view' && item.pendingRequestId && (
                        <Button view="action" size="l" onClick={() => setMode('review')}>
                            {t('reviewPending')}
                        </Button>
                    )}
                    {mode === 'view' && (item.status === 'PUBLISHED' || item.status === 'PENDING') && (
                        <Button size="l" view="outlined-danger" onClick={() => setMode('hide')}>
                            {t('hide')}
                        </Button>
                    )}
                    {mode === 'hide' && (
                        <Button size="l" view="outlined-danger" loading={busy} onClick={() => void hide()}>
                            {t('confirmHide')}
                        </Button>
                    )}
                </Flex>
            </Dialog.Footer>
        </Dialog>
    );
}
