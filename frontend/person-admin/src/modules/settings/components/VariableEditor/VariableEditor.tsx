'use client';

import { useState } from 'react';
import { Alert, Button, Dialog, Flex, Switch, Text, TextInput } from '@gravity-ui/uikit';
import { JsonEditor } from '@/modules/settings/components/JsonEditor/JsonEditor';
import { DateTimeVariableInput } from '@/modules/settings/components/DateTimeVariableInput/DateTimeVariableInput';
import { dynamicPropertyError, type DynamicProperty } from '@persons/dynamic-properties';
import { useTranslate } from '@persons/i18n';
import { dynamicPropertyClient } from '@/shared/dynamicProperties/client';
import { usePersonMutation } from '@persons/person-domain/hooks/usePersonMutation';
import { MutationFeedback } from '@persons/person-domain/MutationFeedback';
import { editableVariableValue, serializeVariableValue } from '@/modules/settings/model/variableValue';
import styles from '@/modules/settings/components/VariableEditor/VariableEditor.module.css';

export function VariableEditor({
    property,
    onClose,
    onSaved,
}: {
    readonly property: DynamicProperty;
    readonly onClose: () => void;
    readonly onSaved: () => void;
}) {
    const t = useTranslate('variables');
    const [value, setValue] = useState(() => editableVariableValue(property));
    const mutation = usePersonMutation(dynamicPropertyError);
    const serialized = serializeVariableValue(property.type, value);
    const dirty =
        serialized !== undefined &&
        serialized !== serializeVariableValue(property.type, editableVariableValue(property));

    return (
        <Dialog
            open
            onClose={() => {
                if (!mutation.pending) {
                    onClose();
                }
            }}
            aria-labelledby="variable-editor-title"
            maxWidth="m"
            fullWidth
        >
            <Dialog.Header caption={t('editTitle')} id="variable-editor-title" />
            <Dialog.Body>
                <Flex direction="column" gap="4">
                    <Text as="code" className={styles.key}>
                        {property.key}
                    </Text>
                    <Text color="secondary">
                        {property.description || t(`names.${property.key.replaceAll('.', '_')}`)}
                    </Text>
                    {property.type === 'BOOLEAN' ? (
                        <Switch
                            checked={value === 'true'}
                            size="l"
                            disabled={mutation.pending}
                            onUpdate={(checked) => setValue(String(checked))}
                            content={t(value === 'true' ? 'enabled' : 'disabled')}
                            controlProps={{ 'aria-label': t('value') }}
                        />
                    ) : property.type === 'INSTANT' ? (
                        <DateTimeVariableInput value={value} onUpdate={setValue} disabled={mutation.pending} />
                    ) : property.type === 'MAP' || property.type === 'JSON' ? (
                        <Flex direction="column" gap="3">
                            <Button
                                view="flat"
                                size="l"
                                disabled={serialized === undefined || mutation.pending}
                                onClick={() => {
                                    if (serialized !== undefined) {
                                        setValue(JSON.stringify(JSON.parse(serialized), null, 2));
                                    }
                                }}
                            >
                                {t('format')}
                            </Button>
                            <JsonEditor
                                value={value}
                                onChange={setValue}
                                readOnly={mutation.pending}
                                label={t('value')}
                            />
                        </Flex>
                    ) : (
                        <TextInput
                            value={value}
                            onUpdate={setValue}
                            size="xl"
                            disabled={mutation.pending}
                            controlProps={{
                                'aria-label': t('value'),
                                inputMode: property.type === 'NUMBER' ? 'decimal' : undefined,
                                maxLength: 16384,
                            }}
                        />
                    )}
                    {serialized === undefined && <Alert theme="danger" message={t('invalid')} />}
                    {mutation.error === 'CONFLICT' ? (
                        <Alert theme="danger" message={t('conflict')} />
                    ) : (
                        <MutationFeedback {...mutation} />
                    )}
                    <Text color="secondary">{t('propagation')}</Text>
                </Flex>
            </Dialog.Body>
            <Dialog.Footer>
                <Flex gap="3" wrap>
                    <Button size="l" onClick={onClose} disabled={mutation.pending}>
                        {t('cancel')}
                    </Button>
                    <Button
                        size="l"
                        view="action"
                        loading={mutation.pending}
                        disabled={!dirty}
                        onClick={() => {
                            if (serialized !== undefined) {
                                mutation.run(
                                    () =>
                                        dynamicPropertyClient.updateVariable({
                                            key: property.key,
                                            dynamicPropertyUpdate: { value: serialized, revision: property.revision },
                                        }),
                                    onSaved,
                                    false,
                                );
                            }
                        }}
                    >
                        {t('save')}
                    </Button>
                </Flex>
            </Dialog.Footer>
        </Dialog>
    );
}
