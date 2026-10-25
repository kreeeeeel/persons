'use client';
import { Button, Checkbox, Flex, Icon, Label, Table, Text } from '@gravity-ui/uikit';
import { FileText, PlayFill } from '@gravity-ui/icons';
import { LoadedImage } from '@persons/ui';
import { useLocale, useTranslate } from '@persons/i18n';
import { IdentityCell } from '@/shared/ui/IdentityCell/IdentityCell';
import type { PublicationRow } from '@/shared/ui/PublicationTable/PublicationTable.types';
import styles from '@/shared/ui/PublicationTable/PublicationTable.module.css';

export function PublicationTable({
    rows,
    onOpen,
    selected,
    onSelection,
}: {
    readonly rows: PublicationRow[];
    readonly onOpen: (id: string) => void;
    readonly selected?: string[];
    readonly onSelection?: (ids: string[]) => void;
}) {
    const t = useTranslate('cms');
    const locale = useLocale();
    const dates = new Intl.DateTimeFormat(locale, {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Europe/Moscow',
    });
    const selectable = rows.filter((row) => row.selectable).map((row) => row.id);
    const checked = selected ?? [];
    return (
        <Table
            data={rows}
            width="max"
            wordWrap
            verticalAlign="middle"
            getRowDescriptor={(row) => ({ id: row.id, interactive: true })}
            onRowClick={(row, _, event) => {
                if (!(event.target instanceof Element) || !event.target.closest('button,a,input,label')) {
                    onOpen(row.id);
                }
            }}
            columns={[
                ...(onSelection
                    ? [
                          {
                              id: 'selection',
                              name: () => (
                                  <Checkbox
                                      controlProps={{ 'aria-label': t('selectAll') }}
                                      checked={
                                          Boolean(selectable.length) && selectable.every((id) => checked.includes(id))
                                      }
                                      indeterminate={
                                          checked.length > 0 && !selectable.every((id) => checked.includes(id))
                                      }
                                      onUpdate={(value) => onSelection(value ? selectable : [])}
                                  />
                              ),
                              width: 44,
                              template: (row: PublicationRow) => (
                                  <Checkbox
                                      controlProps={{ 'aria-label': `${t('view')}: ${row.text}` }}
                                      disabled={!row.selectable}
                                      checked={checked.includes(row.id)}
                                      onUpdate={(value) =>
                                          onSelection(
                                              value ? [...checked, row.id] : checked.filter((id) => id !== row.id),
                                          )
                                      }
                                  />
                              ),
                          },
                      ]
                    : []),
                {
                    id: 'material',
                    name: t('material'),
                    className: styles.materialCell,
                    template: (row) => (
                        <Button
                            view="flat"
                            className={styles.material}
                            aria-label={`${t('view')}: ${row.text || row.title}`}
                            onClick={() => onOpen(row.id)}
                        >
                            <Flex gap="3" alignItems="center">
                                <Flex alignItems="center" justifyContent="center" className={styles.preview}>
                                    {row.preview ? (
                                        <LoadedImage
                                            src={row.preview}
                                            alt=""
                                            width={64}
                                            height={48}
                                            objectFit="cover"
                                        />
                                    ) : (
                                        <Icon data={row.video ? PlayFill : FileText} size={22} />
                                    )}
                                </Flex>
                                <Flex direction="column" gap="1" className={styles.excerpt}>
                                    <Text variant="subheader-1">{row.title}</Text>
                                    <Text color="secondary" className={styles.clamp} title={row.text}>
                                        {row.text || '—'}
                                    </Text>
                                </Flex>
                            </Flex>
                        </Button>
                    ),
                },
                {
                    id: 'page',
                    name: t('page'),
                    className: styles.identityCell,
                    template: (row) => <IdentityCell {...row.page} />,
                },
                {
                    id: 'author',
                    name: t('author'),
                    className: styles.identityCell,
                    template: (row) => <IdentityCell {...row.author} />,
                },
                {
                    id: 'status',
                    name: t('status'),
                    className: styles.statusCell,
                    template: (row) => <Label theme={row.statusTheme}>{row.status}</Label>,
                },
                {
                    id: 'time',
                    name: t('uploadedAt'),
                    className: styles.dateCell,
                    template: (row) => <Text color="secondary">{dates.format(row.createdAt)}</Text>,
                },
                {
                    id: 'size',
                    name: t('weight'),
                    align: 'end',
                    className: styles.sizeCell,
                    template: (row) => {
                        const bytes = row.sizeBytes;
                        if (bytes === undefined) {
                            return <Text color="secondary">—</Text>;
                        }
                        const power = bytes >= 1048576 ? 2 : bytes >= 1024 ? 1 : 0;
                        return (
                            <Text color="secondary" className={styles.bytes}>
                                {new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
                                    bytes / 1024 ** power,
                                )}{' '}
                                {locale === 'ru' ? ['Б', 'КБ', 'МБ'][power] : ['B', 'KB', 'MB'][power]}
                            </Text>
                        );
                    },
                },
            ]}
        />
    );
}
