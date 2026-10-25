'use client';

import '@persons/theme/typography.css';
import { ThemeProvider } from '@gravity-ui/uikit';
import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeSettings {
    readonly preference: ThemePreference;
    readonly setPreference: (value: ThemePreference) => void;
}

const Settings = createContext<ThemeSettings | null>(null);

export function PersonsThemeProvider({
    children,
    preference: initialPreference,
    resolvedTheme,
    locale,
}: {
    readonly children: ReactNode;
    readonly preference: ThemePreference;
    readonly resolvedTheme: 'light' | 'dark';
    readonly locale: 'ru' | 'en';
}) {
    const [preference, updatePreference] = useState(initialPreference);
    const [systemTheme, setSystemTheme] = useState(resolvedTheme);

    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');

        function updateSystem() {
            const resolved = media.matches ? 'dark' : 'light';

            setSystemTheme(resolved);
            document.cookie = `PERSONS_SYSTEM_THEME=${resolved}; Path=/; SameSite=Lax; Max-Age=31536000`;
        }

        updateSystem();
        media.addEventListener('change', updateSystem);

        return () => media.removeEventListener('change', updateSystem);
    }, []);

    function setPreference(value: ThemePreference) {
        updatePreference(value);
        document.cookie = `PERSONS_THEME=${value}; Path=/; SameSite=Lax; Max-Age=31536000`;
    }

    const theme = preference === 'system' ? systemTheme : preference;

    useLayoutEffect(() => {
        const root = document.documentElement;

        root.classList.remove('g-root_theme_light', 'g-root_theme_dark');
        root.classList.add(`g-root_theme_${theme}`);
        root.style.colorScheme = theme;
    }, [theme]);

    return (
        <Settings.Provider value={{ preference, setPreference }}>
            <ThemeProvider theme={theme} lang={locale}>
                {children}
            </ThemeProvider>
        </Settings.Provider>
    );
}

export function useThemePreference() {
    const settings = useContext(Settings);

    if (!settings) {
        throw new Error('ThemePicker requires PersonsThemeProvider');
    }

    return settings;
}
