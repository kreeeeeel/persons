'use client';

import '@gravity-ui/uikit/styles/styles.css';
import '@/shared/styles/globals.css';
import '@/shared/styles/scrollbar.css';
import { getRootClassName } from '@gravity-ui/uikit/server';
import { useParams } from 'next/navigation';
import { uiFont } from '@/shared/theme/fonts';
import { AppProviders } from '@/app/_providers/AppProviders/AppProviders';
import { PageShell } from '@/shared/ui/PageShell/PageShell';
import RouteError from '@/app/[locale]/error';
import { defaultMessages } from '@/shared/i18n/messages';
const { ru, en } = defaultMessages;

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
                    messages={locale === 'en' ? en : ru}
                >
                    <PageShell>
                        <RouteError retry={retry} />
                    </PageShell>
                </AppProviders>
            </body>
        </html>
    );
}
