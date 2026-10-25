'use client';

import { Icon } from '@gravity-ui/uikit';
import { Display, Moon, Sun } from '@gravity-ui/icons';
import { useThemePreference } from '@persons/theme/provider';
import type { ThemePreference } from '@persons/theme/provider';
import styles from '@persons/theme/useThemeMenuItems.module.css';

const SMALL_ICON_SIZE = 16;

export function useThemeMenuItems(labels: Record<ThemePreference, string>) {
    const { preference, setPreference } = useThemePreference();

    return [
        { value: 'light' as const, icon: Sun },
        { value: 'dark' as const, icon: Moon },
        { value: 'system' as const, icon: Display },
    ].map((choice) => ({
        text: labels[choice.value],
        className: styles.item,
        iconStart: <Icon data={choice.icon} size={SMALL_ICON_SIZE} />,
        selected: preference === choice.value,
        action: () => setPreference(choice.value),
    }));
}
