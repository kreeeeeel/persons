'use client';

import { useState } from 'react';
import { Button, Dialog, Flex } from '@gravity-ui/uikit';
import type { ModerationItem } from '@persons/person-client';
import { useTranslate } from '@persons/i18n';
import { ReviewCard } from '@/modules/person/components/ReviewCard/ReviewCard';

export function ModerationReviewDialog({
    item,
    items,
    publicUrl,
    onSaved,
    onClose,
    onNavigate,
}: {
    readonly item: ModerationItem;
    readonly items: ModerationItem[];
    readonly publicUrl: string;
    readonly onSaved: () => void;
    readonly onClose: () => void;
    readonly onNavigate: (item: ModerationItem) => void;
}) {
    const t = useTranslate('moderation');
    const [busy, setBusy] = useState(false);
    const index = items.findIndex((value) => value.id === item.id);
    return (
        <Dialog
            open
            hasCloseButton
            fullWidth
            maxWidth="l"
            contentOverflow="auto"
            aria-label={t('reviewTitle')}
            disableOutsideClick={busy}
            disableEscapeKeyDown={busy}
            onClose={() => {
                if (!busy) {
                    onClose();
                }
            }}
        >
            <Dialog.Header caption={t('reviewTitle')} />
            <Dialog.Body>
                <ReviewCard
                    key={item.id}
                    item={item}
                    publicUrl={publicUrl}
                    onSaved={onSaved}
                    onPendingChange={setBusy}
                />
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t('close')}
                onClickButtonCancel={onClose}
                propsButtonCancel={{ disabled: busy }}
            >
                <Flex gap="2">
                    <Button size="l" disabled={busy || index <= 0} onClick={() => onNavigate(items[index - 1])}>
                        {t('previous')}
                    </Button>
                    <Button
                        size="l"
                        disabled={busy || index < 0 || index >= items.length - 1}
                        onClick={() => onNavigate(items[index + 1])}
                    >
                        {t('next')}
                    </Button>
                </Flex>
            </Dialog.Footer>
        </Dialog>
    );
}
