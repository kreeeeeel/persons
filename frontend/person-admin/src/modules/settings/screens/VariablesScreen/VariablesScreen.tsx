'use client';

import { useCallback, useState } from 'react';
import { Alert, Button, Flex, Label, Text, TextInput } from '@gravity-ui/uikit';
import type { TableColumnConfig } from '@gravity-ui/uikit';
import { dynamicPropertyError, type DynamicProperty } from '@persons/dynamic-properties';
import { useTranslate } from '@persons/i18n';
import { dynamicPropertyClient } from '@/shared/dynamicProperties/client';
import { usePersonData } from '@persons/person-domain/hooks/usePersonData';
import { ListTable } from '@/shared/ui/ListTable/ListTable';
import { ActionTable } from '@/shared/ui/ActionTable/ActionTable';
import { ListPageHeader } from '@/shared/ui/ListPageHeader/ListPageHeader';
import { VariableEditor } from '@/modules/settings/components/VariableEditor/VariableEditor';
import { VariableViewer } from '@/modules/settings/components/VariableViewer/VariableViewer';
import { editableVariableValue } from '@/modules/settings/model/variableValue';
import styles from '@/modules/settings/screens/VariablesScreen/VariablesScreen.module.css';

export function VariablesScreen() {
    const t = useTranslate('variables');
    const load = useCallback((signal: AbortSignal) => dynamicPropertyClient.listVariables({ signal }), []);
    const resource = usePersonData('dynamic-variables', load, undefined, dynamicPropertyError);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<DynamicProperty>();
    const [viewed, setViewed] = useState<DynamicProperty>();
    const [saved, setSaved] = useState(false);
    const name = (property: DynamicProperty) => property.description || t(`names.${property.key.replaceAll('.', '_')}`);
    const search = query.trim().toLocaleLowerCase();
    const data =
        resource.data
            ?.filter((property) =>
                `${property.key} ${name(property)} ${property.type}`.toLocaleLowerCase().includes(search),
            )
            .map((property) => ({ ...property, id: property.key })) ?? [];
    const columns: TableColumnConfig<DynamicProperty>[] = [
        {
            id: 'key',
            name: t('key'),
            primary: true,
            template: (property) => (
                <Flex direction="column" gap="2">
                    <Text className={styles.name}>{name(property)}</Text>
                    <Text as="code" color="secondary" className={styles.key}>
                        {property.key}
                    </Text>
                </Flex>
            ),
        },
        { id: 'type', name: t('type'), template: (property) => <Label theme="info">{property.type}</Label> },
        {
            id: 'value',
            name: t('value'),
            template: (property) =>
                property.type === 'BOOLEAN' ? (
                    <Label theme={property.value === 'true' ? 'success' : 'normal'}>
                        {t(property.value === 'true' ? 'enabled' : 'disabled')}
                    </Label>
                ) : property.type === 'MAP' || property.type === 'JSON' ? (
                    <Button
                        size="l"
                        view="flat"
                        onClick={() => setViewed(property)}
                        aria-label={`${t('view')}: ${name(property)}`}
                    >
                        {t('view')}
                    </Button>
                ) : (
                    <Text as="code" className={styles.value}>
                        {editableVariableValue(property) || t('emptyString')}
                    </Text>
                ),
        },
    ];

    return (
        <Flex direction="column" gap="5">
            <ListPageHeader
                title={t('title')}
                description={t('description')}
                action={
                    <Button size="l" view="outlined" loading={resource.refreshing} onClick={resource.refresh}>
                        {t('refresh')}
                    </Button>
                }
            />
            <TextInput
                size="xl"
                value={query}
                onUpdate={setQuery}
                placeholder={t('search')}
                controlProps={{ 'aria-label': t('search') }}
                hasClear
            />
            {saved && <Alert theme="success" message={t('saved')} />}
            <ListTable
                title={t('title')}
                loading={resource.loading}
                error={resource.error}
                empty={!data.length}
                emptyTitle={t('empty')}
                emptyDescription={t('emptyHint')}
                illustration="settings"
                retry={resource.refresh}
            >
                <ActionTable
                    data={data}
                    columns={columns}
                    label={name}
                    actionLabel={t('edit')}
                    onOpen={(property) => {
                        setSelected(property);
                        setSaved(false);
                    }}
                />
            </ListTable>
            <Text color="secondary">{t('descriptionHint')}</Text>
            <Text color="secondary">{t('propagation')}</Text>
            {selected && (
                <VariableEditor
                    key={`${selected.key}:${selected.revision}`}
                    property={selected}
                    onClose={() => setSelected(undefined)}
                    onSaved={() => {
                        setSelected(undefined);
                        setSaved(true);
                        resource.refresh();
                    }}
                />
            )}
            {viewed && <VariableViewer property={viewed} onClose={() => setViewed(undefined)} />}
        </Flex>
    );
}
