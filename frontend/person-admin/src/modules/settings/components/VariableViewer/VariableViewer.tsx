'use client';

import { Button, Dialog, Flex, Text } from '@gravity-ui/uikit';
import type { DynamicProperty } from '@persons/dynamic-properties';
import { useTranslate } from '@persons/i18n';
import { JsonEditor } from '@/modules/settings/components/JsonEditor/JsonEditor';
import { editableVariableValue } from '@/modules/settings/model/variableValue';

export function VariableViewer({
    property,
    onClose,
}: {
    readonly property: DynamicProperty;
    readonly onClose: () => void;
}) {
    const t = useTranslate('variables');
    return (
        <Dialog open onClose={onClose} maxWidth="m" fullWidth aria-labelledby="variable-viewer-title">
            <Dialog.Header caption={t('viewTitle')} id="variable-viewer-title" />
            <Dialog.Body>
                <Flex direction="column" gap="4">
                    <Text>{t(`names.${property.key.replaceAll('.', '_')}`)}</Text>
                    <JsonEditor value={editableVariableValue(property)} readOnly label={t('value')} />
                </Flex>
            </Dialog.Body>
            <Dialog.Footer>
                <Button size="l" onClick={onClose}>
                    {t('close')}
                </Button>
            </Dialog.Footer>
        </Dialog>
    );
}
