'use client';

import '@gravity-ui/uikit/styles/styles.css';
import '@/shared/styles/globals.css';
import { getRootClassName } from '@gravity-ui/uikit/server';
import { useParams } from 'next/navigation';
import { uiFont } from '@/shared/theme/fonts';
import { AppProviders } from '@/app/_providers/AppProviders/AppProviders';
import RouteError from '@/app/[locale]/error';
import { defaultMessages } from '@/shared/i18n/messages';

export default function GlobalError({ retry }: { readonly retry: () => void }) {
    const params = useParams();
    const locale = params?.locale === 'en' ? 'en' : 'ru';

    return (
        <html lang={locale} className={`${getRootClassName({ theme: 'light' })} ${uiFont.variable}`}>
            <body>
                <AppProviders
                    locale={locale}
                    preference="system"
                    resolvedTheme="light"
                    messages={defaultMessages[locale]}
                >
                    <RouteError retry={retry} />
                </AppProviders>
            </body>
        </html>
    );
}
