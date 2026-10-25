"use client";

import { Button, Flex, Icon, Select } from "@gravity-ui/uikit";
import { BarsDescendingAlignLeft } from "@gravity-ui/icons";
import type { Ref } from "react";
import { useTranslate } from "@persons/i18n";
import type { FeedSortControlProps } from "@persons/person-domain/FeedSortControl/FeedSortControl.types";
import styles from "@persons/person-domain/FeedSortControl/FeedSortControl.module.css";

const ORDERS = ["NEWEST", "OLDEST", "MOST_LIKED", "MOST_DISLIKED"] as const;

export function FeedSortControl({
    value,
    onChange,
    compact,
    mine = false,
    onMineChange,
}: FeedSortControlProps) {
    const t = useTranslate("person");
    return (
        <Flex className={styles.root} gap="3" alignItems="center" wrap>
            {onMineChange && (
                <Select
                    view="clear"
                    size="l"
                    value={[mine ? "mine" : "all"]}
                    aria-label={t("feedScope")}
                    options={[
                        { value: "all", content: t("allEntries") },
                        { value: "mine", content: t("myEntries") },
                    ]}
                    onUpdate={([value]) => onMineChange(value === "mine")}
                />
            )}
            <Select
                className={styles.select}
                size="l"
                value={[value]}
                aria-label={t("sortFeed")}
                renderControl={
                    compact
                        ? ({ ref, triggerProps }) => (
                              <Button
                                  {...triggerProps}
                                  ref={ref as Ref<HTMLButtonElement>}
                                  size="l"
                                  view="flat"
                              >
                                  <Icon
                                      data={BarsDescendingAlignLeft}
                                      size={18}
                                  />
                                  {t("sortFeed")}
                              </Button>
                          )
                        : undefined
                }
                options={ORDERS.map((order) => ({
                    value: order,
                    content: t("sort" + order),
                }))}
                onUpdate={(values) => {
                    const next = ORDERS.find((order) => order === values[0]);
                    if (next) {
                        onChange(next);
                    }
                }}
            />
        </Flex>
    );
}
