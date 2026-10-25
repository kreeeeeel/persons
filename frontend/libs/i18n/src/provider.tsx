'use client';

import { NextIntlClientProvider, useLocale as useIntlLocale, useTranslations } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import type { Locale } from '@persons/i18n/locale';
import { resolveLocale } from '@persons/i18n/locale';

const FIRST_LANGUAGE_SEGMENT = 1;

type LocaleCatalogs = Partial<Record<Locale, AbstractIntlMessages>>;

const Catalogs = createContext<LocaleCatalogs | undefined>(undefined);

export interface I18nProviderProps {
    readonly locale: Locale;
    readonly messages: AbstractIntlMessages;
    readonly catalogs?: LocaleCatalogs;
    readonly children: ReactNode;
}

export function I18nProvider({ locale, messages, catalogs, children }: I18nProviderProps) {
    const pathname = usePathname();
    const requestedLocale = pathname?.split('/')[FIRST_LANGUAGE_SEGMENT];
    const activeLocale =
        (requestedLocale === 'ru' || requestedLocale === 'en') && catalogs?.[requestedLocale]
            ? requestedLocale
            : locale;

    useLayoutEffect(() => {
        document.documentElement.lang = activeLocale;
    }, [activeLocale]);

    return (
        <Catalogs value={catalogs}>
            <NextIntlClientProvider
                locale={activeLocale}
                messages={catalogs?.[activeLocale] ?? messages}
                timeZone="Europe/Moscow"
            >
                {children}
            </NextIntlClientProvider>
        </Catalogs>
    );
}

export function useLocaleCatalogs() {
    return useContext(Catalogs);
}

export function useTranslate(namespace?: string) {
    const translate = useTranslations(namespace);

    return translate;
}

export function useLocale(): Locale {
    return resolveLocale(useIntlLocale());
}
