'use client';

import { Button, DropdownMenu, Icon, Menu, SegmentedRadioGroup } from '@gravity-ui/uikit';
import { Display, Moon, Sun } from '@gravity-ui/icons';
import { useThemePreference } from '@persons/theme/provider';
import { useThemeMenuItems } from '@persons/theme/useThemeMenuItems';
import type { ThemePreference } from '@persons/theme/provider';
import styles from '@persons/theme/ThemePicker/ThemePicker.module.css';

const SELECTED_2 = 2;
const ACTION_ICON_SIZE = 18;

export function ThemePicker({
    labels,
    variant = 'dropdown',
}: {
    readonly labels: Record<ThemePreference | 'theme', string>;
    readonly variant?: 'dropdown' | 'menu' | 'inline';
}) {
    const { preference, setPreference } = useThemePreference();
    const items = useThemeMenuItems(labels);
    const choices = [
        { value: 'light' as const, icon: Sun },
        { value: 'dark' as const, icon: Moon },
        { value: 'system' as const, icon: Display },
    ];

    if (variant === 'inline') {
        return (
            <SegmentedRadioGroup value={preference} onUpdate={(value) => setPreference(value as ThemePreference)}>
                {choices.map((choice) => (
                    <SegmentedRadioGroup.Option key={choice.value} value={choice.value}>
                        {labels[choice.value]}
                    </SegmentedRadioGroup.Option>
                ))}
            </SegmentedRadioGroup>
        );
    }

    if (variant === 'menu') {
        return (
            <Menu>
                {choices.map((choice) => (
                    <Menu.Item key={choice.value} onClick={() => setPreference(choice.value)}>
                        <Icon data={choice.icon} /> {labels[choice.value]}
                    </Menu.Item>
                ))}
            </Menu>
        );
    }

    const selected = choices.find((choice) => choice.value === preference) ?? choices[SELECTED_2];

    return (
        <DropdownMenu
            items={items}
            popupProps={{ className: styles.popup }}
            renderSwitcher={(props) => (
                <Button {...props} view="flat" size="l" aria-label={labels.theme} className={styles.switcher}>
                    <Icon data={selected.icon} size={ACTION_ICON_SIZE} />
                </Button>
            )}
        />
    );
}
