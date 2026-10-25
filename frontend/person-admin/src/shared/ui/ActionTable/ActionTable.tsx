'use client';

import { useState } from 'react';
import type { MouseEvent } from 'react';
import { Box, Button, DropdownMenu, Table } from '@gravity-ui/uikit';
import type { PopupProps } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import styles from '@/shared/ui/ActionTable/ActionTable.module.css';
import type { ActionTableProps } from '@/shared/ui/ActionTable/ActionTable.types';

export function ActionTable<T extends { id: string }>({
    data,
    columns,
    label,
    actions,
    onOpen,
    actionLabel,
    disabled,
}: ActionTableProps<T>) {
    const t = useTranslate('cms');
    const [selected, setSelected] = useState<{
        item: T;
        anchor: NonNullable<PopupProps['anchorElement']>;
    }>();
    function open(item: T, event: MouseEvent<HTMLElement>) {
        if (disabled) {
            return;
        }
        if (onOpen) {
            onOpen(item);
            return;
        }
        const { clientX: x, clientY: y, currentTarget } = event;
        setSelected({
            item,
            anchor:
                x || y
                    ? {
                          contextElement: currentTarget,
                          getBoundingClientRect: () => new DOMRect(x, y, 0, 0),
                      }
                    : currentTarget,
        });
    }
    return (
        <>
            <Table
                data={data}
                width="max"
                wordWrap
                verticalAlign="middle"
                getRowDescriptor={(item) => ({ id: item.id, interactive: true })}
                onRowClick={(item, _, event) => {
                    if (!(event.target instanceof Element) || !event.target.closest('button,a,input,label')) {
                        open(item, event);
                    }
                }}
                columns={columns.map((column, index) =>
                    index !== 0
                        ? column
                        : {
                              ...column,
                              template: (item: T, row: number) => (
                                  <Button
                                      view="flat"
                                      className={styles.trigger}
                                      aria-label={`${actionLabel ?? t('actions')}: ${label(item)}`}
                                      aria-haspopup={onOpen ? 'dialog' : 'menu'}
                                      aria-expanded={onOpen ? undefined : selected?.item.id === item.id}
                                      disabled={disabled}
                                      onClick={(event) => open(item, event)}
                                  >
                                      {typeof column.template === 'function'
                                          ? column.template(item, row)
                                          : String(item.id)}
                                  </Button>
                              ),
                          },
                )}
            />
            {selected && actions && (
                <DropdownMenu
                    open
                    size="l"
                    onOpenToggle={(value: boolean) => {
                        if (!value) {
                            setSelected(undefined);
                        }
                    }}
                    items={actions(selected.item)}
                    switcherWrapperClassName={styles.switcher}
                    renderSwitcher={() => <Box />}
                    popupProps={{
                        anchorElement: selected.anchor,
                        floatingClassName: styles.popup,
                        placement: 'bottom-start',
                        strategy: 'fixed',
                    }}
                />
            )}
        </>
    );
}
