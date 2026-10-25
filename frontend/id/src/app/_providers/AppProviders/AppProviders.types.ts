import type { ReactNode } from 'react';
import type { AbstractIntlMessages } from 'next-intl';
import type { Locale } from '@persons/i18n';
import type { ThemePreference } from '@persons/theme';

export interface AppProvidersProps {
    readonly children: ReactNode;
    readonly locale: Locale;
    readonly messages: AbstractIntlMessages;
    readonly catalogs?: Partial<Record<Locale, AbstractIntlMessages>>;
    readonly preference: ThemePreference;
    readonly resolvedTheme: 'light' | 'dark';
}
