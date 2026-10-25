'use client';

import { useId, useState } from 'react';
import { Box, Button, Checkbox, Flex, Select, Text, TextArea } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import { PersonPicker } from '@persons/person-domain/PersonPicker';
import { LabeledTextInput } from '@persons/ui/LabeledTextInput';
import type {
    PageRestriction,
    PageRestrictionInput,
    PageRestrictionScope,
    PersonSummary,
} from '@persons/person-client';
import styles from '@/modules/users/components/PageRestrictionsDialog/PageRestrictionsDialog.module.css';

const SCOPES: PageRestrictionScope[] = ['COMMENTS', 'RATINGS', 'LOANS', 'MEDIA', 'PROFILE', 'REACTIONS'];
function localDate(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function PageRestrictionForm({
    initial,
    pending,
    onSubmit,
    onCancel,
}: {
    readonly initial?: PageRestriction;
    readonly pending: boolean;
    readonly onSubmit: (input: PageRestrictionInput) => void;
    readonly onCancel: () => void;
}) {
    const admin = useTranslate('admin');
    const t = useTranslate('person');
    const reasonId = useId();
    const [people, setPeople] = useState<PersonSummary[]>(
        initial ? [{ id: initial.personId, tag: initial.personTag, fullName: initial.personName }] : [],
    );
    const [scopes, setScopes] = useState<PageRestrictionScope[]>(initial ? [...initial.scopes] : ['COMMENTS']);
    const [reason, setReason] = useState(initial?.reason ?? '');
    const [openedAt] = useState(Date.now);
    const [forever, setForever] = useState(!initial?.expiresAt);
    const [expiry, setExpiry] = useState(() => localDate(initial?.expiresAt ?? new Date(openedAt + 86400000)));
    const expiresAt = forever ? undefined : new Date(expiry);
    const valid =
        people.length === 1 &&
        scopes.length > 0 &&
        reason.trim().length >= 3 &&
        (forever || Boolean(expiresAt && Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() > openedAt));
    return (
        <Flex
            as="form"
            direction="column"
            gap="4"
            onSubmit={(event) => {
                event.preventDefault();
                if (valid) {
                    onSubmit({ personId: people[0].id, scopes: new Set(scopes), reason: reason.trim(), expiresAt });
                }
            }}
        >
            <Text variant="subheader-2">{admin(initial ? 'editRestriction' : 'addPageRestriction')}</Text>
            <PersonPicker
                value={people}
                onChange={setPeople}
                limit={1}
                label={admin('restrictionPage')}
                disabled={pending || Boolean(initial)}
            />
            <Flex direction="column" gap="2" className={styles.field}>
                <Text>{t('restrictionActions')}</Text>
                <Select
                    size="l"
                    multiple
                    value={scopes}
                    options={SCOPES.map((scope) => ({ value: scope, content: t(`scope${scope}`) }))}
                    onUpdate={(values) => setScopes(values as PageRestrictionScope[])}
                    disabled={pending}
                    aria-label={t('restrictionActions')}
                />
            </Flex>
            <Flex direction="column" gap="2">
                <Text as="label" htmlFor={reasonId}>
                    {t('restrictionReason')}
                </Text>
                <TextArea
                    id={reasonId}
                    value={reason}
                    onUpdate={setReason}
                    minRows={2}
                    size="l"
                    disabled={pending}
                    controlProps={{ 'aria-label': t('restrictionReason'), maxLength: 1000 }}
                />
            </Flex>
            <Checkbox
                content={admin('restrictionForever')}
                checked={forever}
                onUpdate={setForever}
                disabled={pending}
            />
            {!forever && (
                <Box className={styles.field}>
                    <LabeledTextInput
                        size="l"
                        label={t('restrictionEnd')}
                        value={expiry}
                        onUpdate={setExpiry}
                        disabled={pending}
                        controlProps={{ type: 'datetime-local', 'aria-label': t('restrictionEnd') }}
                    />
                </Box>
            )}
            <Flex gap="2" wrap>
                <Button view="action" type="submit" size="l" disabled={!valid || pending} loading={pending}>
                    {t('saveDirect')}
                </Button>
                {initial && (
                    <Button size="l" disabled={pending} onClick={onCancel}>
                        {t('cancel')}
                    </Button>
                )}
            </Flex>
        </Flex>
    );
}
