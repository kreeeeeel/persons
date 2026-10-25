import 'server-only';

import { Configuration, I18nApi } from '@persons/i18n-client';
import type { Locale } from '@persons/i18n/locale';
import type { AbstractIntlMessages } from 'next-intl';

const REQUEST_TIMEOUT_MILLIS = 4000;
const REVALIDATE_60 = 60;

export async function loadMessages(locale: Locale, basePath: string, defaults: Record<string, AbstractIntlMessages>) {
    const api = new I18nApi(
        new Configuration({
            basePath,
            fetchApi: (input, init) =>
                fetch(input, {
                    ...init,
                    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLIS),
                    next: { revalidate: REVALIDATE_60 },
                }),
        }),
    );

    const catalogs = await Promise.all(
        Object.entries(defaults).map(async ([namespace, messages]) => {
            try {
                const catalog = await api.getCatalog({ locale, namespace });

                return [namespace, { ...messages, ...catalog.messages }] as const;
            } catch (error) {
                console.warn('Translation service unavailable', {
                    locale,
                    namespace,
                    cause: error instanceof Error ? error.name : 'Unknown',
                });

                return [namespace, messages] as const;
            }
        }),
    );

    return Object.fromEntries(catalogs);
}
