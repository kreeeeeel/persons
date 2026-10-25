'use client';

import { useEffect, useId, useState, useTransition } from 'react';
import { Alert, Button, Flex, Label, Link, Text, TextArea } from '@gravity-ui/uikit';
import { useLocale, useTranslate } from '@persons/i18n';
import type { Decision, ModerationItem } from '@persons/person-client';
import { personClient, personError } from '@persons/person-domain/api/browser';
import { ModerationDetails } from '@/modules/person/components/ModerationDetails/ModerationDetails';
import { moderationCategory, moderationDestination } from '@/modules/moderation/model/content';
import styles from '@/modules/person/components/ReviewCard/ReviewCard.module.css';

export function ReviewCard({
    item,
    publicUrl,
    onSaved,
    onPendingChange,
}: {
    readonly item: ModerationItem;
    readonly publicUrl: string;
    readonly onSaved: () => void;
    readonly onPendingChange?: (pending: boolean) => void;
}) {
    const t = useTranslate('person');
    const m = useTranslate('moderation');
    const reasonId = useId();
    const locale = useLocale();
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string>();
    const [pending, startTransition] = useTransition();

    useEffect(() => onPendingChange?.(pending), [pending, onPendingChange]);

    function decide(decision: Decision) {
        setError(undefined);
        if (decision === 'REJECT' && !reason.trim()) {
            setError('reasonRequired');
            return;
        }

        startTransition(async () => {
            try {
                await personClient.admin.decideModeration({
                    id: item.id,
                    decisionInput: { decision, reason: reason.trim() || undefined },
                });
                onSaved();
            } catch (failure) {
                setError(await personError(failure));
            }
        });
    }

    return (
        <Flex as="article" direction="column" gap="5" className={styles.card}>
            <Flex alignItems="center" justifyContent="space-between" gap="3" wrap>
                <Text variant="subheader-3">{t(item.kind)}</Text>
                <Label
                    theme={item.status === 'APPROVED' ? 'success' : item.status === 'REJECTED' ? 'danger' : 'warning'}
                >
                    {t(item.status)}
                </Label>
            </Flex>
            <Flex direction="column" gap="3" className={styles.context}>
                <Text color="secondary">{m('destination')}</Text>
                <Link href={moderationDestination(item, publicUrl, locale)} target="_blank" rel="noopener noreferrer">
                    <Text variant="subheader-3">{item.personName || `@${item.personTag}`}</Text>
                </Link>
                <Text color="secondary">
                    @{item.personTag} · {m(`section${moderationCategory(item)}`)}
                </Text>
                <Flex gap="4" wrap>
                    <Text>
                        {m('author')}: {item.authorName}
                    </Text>
                    <Text color="secondary">
                        {new Intl.DateTimeFormat(locale, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: 'Europe/Moscow',
                        }).format(item.createdAt)}
                    </Text>
                </Flex>
            </Flex>
            <ModerationDetails payload={item.payload} item={item} />
            {item.automatic && <Alert theme="info" align="center" message={m('automatic')} />}
            {item.reviewerName && <Text color="secondary">{m('reviewer', { name: item.reviewerName })}</Text>}
            {item.reviewedAt && (
                <Text color="secondary">
                    {m('reviewedAt', {
                        date: new Intl.DateTimeFormat(locale, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: 'Europe/Moscow',
                        }).format(item.reviewedAt),
                    })}
                </Text>
            )}
            {item.reason && (
                <Text>
                    {m('reason')}: {item.reason}
                </Text>
            )}
            {error && <Alert theme="danger" message={t(error)} />}
            {item.status === 'PENDING' && (
                <>
                    <Text as="label" htmlFor={reasonId}>
                        {m('reason')}
                    </Text>
                    <Text color="secondary">{m('reasonHint')}</Text>
                    <TextArea
                        id={reasonId}
                        size="xl"
                        value={reason}
                        onUpdate={setReason}
                        minRows={2}
                        disabled={pending}
                        controlProps={{ 'aria-label': m('reason'), maxLength: 1000 }}
                    />
                    <Flex gap="3" wrap className={styles.actions}>
                        <Button
                            size="xl"
                            view="action"
                            onClick={() => decide('APPROVE')}
                            disabled={pending}
                            loading={pending}
                        >
                            {t('approve')}
                        </Button>
                        <Button size="xl" view="outlined-danger" onClick={() => decide('REJECT')} disabled={pending}>
                            {t('reject')}
                        </Button>
                    </Flex>
                </>
            )}
        </Flex>
    );
}
