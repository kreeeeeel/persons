'use client';
import { useEffect, useState } from 'react';
import { Button, Flex, Icon, Popup, Select, Text } from '@gravity-ui/uikit';
import { Plus, Xmark } from '@gravity-ui/icons';
import { useLocale, useTranslate } from '@persons/i18n';
import { ListToolbar } from '@/shared/ui/ListToolbar/ListToolbar';
import { CalendarFilter } from '@/shared/ui/CalendarFilter/CalendarFilter';
import { FilterIdentityPicker } from '@/shared/ui/FilterIdentityPicker/FilterIdentityPicker';
import type { ListFilterField } from '@/shared/ui/ListFilterBar/ListFilterBar.types';
import styles from '@/shared/ui/ListFilterBar/ListFilterBar.module.css';

export function ListFilterBar({
    search,
    onSearch,
    placeholder,
    fields = [],
}: {
    readonly search: string;
    readonly onSearch: (value: string) => void;
    readonly placeholder: string;
    readonly fields?: ListFilterField[];
}) {
    const t = useTranslate('cms');
    const locale = useLocale();
    const [draft, setDraft] = useState({ source: search, value: search });
    if (draft.source !== search) {
        setDraft({ source: search, value: draft.value === draft.source ? search : draft.value });
    }
    useEffect(() => {
        if (draft.value === search) {
            return;
        }
        const timer = window.setTimeout(() => onSearch(draft.value), 300);
        return () => window.clearTimeout(timer);
    }, [draft.value, search, onSearch]);
    const [editing, setEditing] = useState<string>();
    const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
    const field = fields.find((item) => item.key === editing);
    const active = fields.filter((item) => item.value && item.value !== item.defaultValue);
    const available = fields.filter((item) => !active.includes(item));
    function label(item: ListFilterField) {
        if (item.type === 'date' && item.value) {
            return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeZone: 'UTC' }).format(
                new Date(`${item.value}T00:00:00Z`),
            );
        }
        return item.valueLabel || item.options?.find((option) => option.value === item.value)?.content || item.value;
    }
    function choose(value: string, text?: string) {
        field?.onChange(value, text);
        setEditing(undefined);
    }
    return (
        <>
            <ListToolbar
                search={draft.value}
                onSearch={(value) => setDraft({ source: search, value })}
                placeholder={placeholder}
                filters={
                    <>
                        {active.map((item) => (
                            <Flex key={item.key} alignItems="center" className={styles.chip}>
                                <Button
                                    view="flat"
                                    size="l"
                                    className={styles.chipButton}
                                    onClick={(event) => {
                                        setAnchor(event.currentTarget);
                                        setEditing(item.key);
                                    }}
                                >
                                    {item.label}: {label(item)}
                                </Button>
                                <Button
                                    view="flat-secondary"
                                    size="m"
                                    aria-label={t('removeFilter', { name: item.label })}
                                    onClick={() => item.onChange(item.defaultValue ?? '')}
                                >
                                    <Icon data={Xmark} size={14} />
                                </Button>
                            </Flex>
                        ))}
                        {fields.length > 0 && (
                            <Button
                                view="flat-secondary"
                                size="l"
                                disabled={!available.length}
                                aria-label={t('addFilter')}
                                onClick={(event) => {
                                    setAnchor(event.currentTarget);
                                    setEditing('');
                                }}
                            >
                                <Icon data={Plus} size={20} />
                            </Button>
                        )}
                    </>
                }
            />
            <Popup
                open={editing !== undefined}
                anchorElement={anchor}
                placement="bottom-start"
                disableFocusOut
                onOpenChange={(open) => {
                    if (!open) {
                        setEditing(undefined);
                    }
                }}
                className={styles.popup}
                aria-label={t('editFilter')}
            >
                <Flex direction="column" gap="3" className={field?.type === 'date' ? styles.calendar : styles.editor}>
                    {editing === ''
                        ? available.map((item) => (
                              <Button
                                  key={item.key}
                                  size="l"
                                  view="flat"
                                  className={styles.menuItem}
                                  onClick={() => setEditing(item.key)}
                              >
                                  {item.label}
                              </Button>
                          ))
                        : field && (
                              <>
                                  <Text variant="subheader-2">{field.label}</Text>
                                  {field.type === 'date' ? (
                                      <CalendarFilter
                                          label={field.label}
                                          value={field.value}
                                          min={field.min}
                                          max={field.max}
                                          onChange={choose}
                                      />
                                  ) : field.type === 'person' || field.type === 'user' ? (
                                      <FilterIdentityPicker type={field.type} onChange={choose} />
                                  ) : (
                                      <Select
                                          size="l"
                                          width="max"
                                          filterable
                                          disablePortal
                                          value={field.value ? [field.value] : []}
                                          options={field.options ?? []}
                                          aria-label={field.label}
                                          onUpdate={([value]) => choose(value ?? '')}
                                      />
                                  )}
                              </>
                          )}
                </Flex>
            </Popup>
        </>
    );
}
