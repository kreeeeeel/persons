'use client';

import { useCallback, useState } from 'react';
import { Button, Dialog, Flex, Icon, Label, Link, Text } from '@gravity-ui/uikit';
import { Pencil, TrashBin } from '@gravity-ui/icons';
import { useLocale, useTranslate } from '@persons/i18n';
import type { PageRestriction, PageRestrictionInput } from '@persons/person-client';
import { personClient } from '@persons/person-domain/api/browser';
import { usePersonData } from '@persons/person-domain/hooks/usePersonData';
import { usePersonMutation } from '@persons/person-domain/hooks/usePersonMutation';
import { LoadErrorContext } from '@persons/ui/loading/LoadErrorContext';
import { FeedContent } from '@persons/person-domain/FeedContent';
import { EmptyState } from '@persons/person-domain/EmptyState';
import { MutationFeedback } from '@persons/person-domain/MutationFeedback';
import { PageRestrictionForm } from '@/modules/users/components/PageRestrictionForm/PageRestrictionForm';
import styles from '@/modules/users/components/PageRestrictionsDialog/PageRestrictionsDialog.module.css';

export function PageRestrictionsDialog({
    userId,
    name,
    publicUrl,
    onClose,
    onSaved,
}: {
    readonly userId: string;
    readonly name: string;
    readonly publicUrl: string;
    readonly onClose: () => void;
    readonly onSaved: () => void;
}) {
    const t = useTranslate('admin');
    const person = useTranslate('person');
    const locale = useLocale();
    const load = useCallback(
        (signal: AbortSignal) => personClient.pageRestrictions.listPageRestrictions({ id: userId }, { signal }),
        [userId],
    );
    const resource = usePersonData(`page-restrictions:${userId}`, load);
    const mutation = usePersonMutation();
    const [editing, setEditing] = useState<PageRestriction>();
    const [revision, setRevision] = useState(0);
    function saved() {
        setEditing(undefined);
        setRevision((value) => value + 1);
        resource.refresh();
        onSaved();
    }
    function submit(input: PageRestrictionInput) {
        mutation.run(
            () => personClient.pageRestrictions.setPageRestriction({ id: userId, pageRestrictionInput: input }),
            saved,
            false,
        );
    }
    return (
        <Dialog
            open
            fullWidth
            maxWidth="m"
            contentOverflow="auto"
            hasCloseButton
            aria-label={t('pageRestrictions')}
            disableOutsideClick={mutation.pending}
            disableEscapeKeyDown={mutation.pending}
            onClose={() => {
                if (!mutation.pending) {
                    onClose();
                }
            }}
        >
            <Dialog.Header caption={t('pageRestrictions')} />
            <Dialog.Body>
                <Flex direction="column" gap="5">
                    <Flex direction="column" gap="2">
                        <Text variant="subheader-2">{name}</Text>
                        <Text color="secondary">{t('pageRestrictionsDescription')}</Text>
                    </Flex>
                    <MutationFeedback {...mutation} />
                    <LoadErrorContext value="dialog">
                        <FeedContent
                            loading={resource.loading}
                            error={resource.error}
                            empty={false}
                            emptyTitle=""
                            emptyDescription=""
                            onRetry={resource.refresh}
                        >
                            {!resource.data?.items.length ? (
                                <EmptyState
                                    illustration="restrictions"
                                    description={t('pageRestrictionEmpty')}
                                    compact
                                />
                            ) : (
                                <Flex direction="column" gap="3">
                                    {resource.data.items.map((item) => (
                                        <Flex key={item.id} direction="column" gap="3" className={styles.item}>
                                            <Flex alignItems="center" justifyContent="space-between" gap="2">
                                                <Link
                                                    href={
                                                        new URL(
                                                            `/${locale}/person/${encodeURIComponent(item.personTag)}`,
                                                            publicUrl,
                                                        ).href
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {item.personName} · @{item.personTag}
                                                </Link>
                                                <Flex gap="1">
                                                    <Button
                                                        size="l"
                                                        view="flat"
                                                        disabled={mutation.pending}
                                                        aria-label={`${t('editRestriction')}: ${item.personName}`}
                                                        onClick={() => setEditing(item)}
                                                    >
                                                        <Icon data={Pencil} size={18} />
                                                    </Button>
                                                    <Button
                                                        size="l"
                                                        view="flat-danger"
                                                        disabled={mutation.pending}
                                                        aria-label={`${person('revokeRestriction')}: ${item.personName}`}
                                                        onClick={() =>
                                                            mutation.run(
                                                                () =>
                                                                    personClient.pageRestrictions.revokePageRestriction(
                                                                        {
                                                                            id: userId,
                                                                            restrictionId: item.id,
                                                                        },
                                                                    ),
                                                                saved,
                                                                false,
                                                            )
                                                        }
                                                    >
                                                        <Icon data={TrashBin} size={18} />
                                                    </Button>
                                                </Flex>
                                            </Flex>
                                            <Flex gap="2" wrap alignItems="center">
                                                <Label theme={item.active ? 'warning' : 'normal'}>
                                                    {t(item.active ? 'restrictionActive' : 'restrictionExpired')}
                                                </Label>
                                                {[...item.scopes].map((scope) => (
                                                    <Label key={scope}>{person(`scope${scope}`)}</Label>
                                                ))}
                                            </Flex>
                                            <Text>{item.reason}</Text>
                                            <Text color="secondary">
                                                {item.expiresAt
                                                    ? t('restrictionUntil', {
                                                          date: new Intl.DateTimeFormat(locale, {
                                                              dateStyle: 'medium',
                                                              timeStyle: 'short',
                                                          }).format(item.expiresAt),
                                                      })
                                                    : t('restrictionForever')}
                                            </Text>
                                        </Flex>
                                    ))}
                                </Flex>
                            )}
                            <PageRestrictionForm
                                key={editing?.id ?? revision}
                                initial={editing}
                                pending={mutation.pending}
                                onSubmit={submit}
                                onCancel={() => setEditing(undefined)}
                            />
                        </FeedContent>
                    </LoadErrorContext>
                </Flex>
            </Dialog.Body>
        </Dialog>
    );
}
