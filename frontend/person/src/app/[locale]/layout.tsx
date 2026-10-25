import '@gravity-ui/uikit/styles/styles.css';
import '@/shared/styles/globals.css';
import '@/shared/styles/scrollbar.css';

import { guardAccount } from '@/modules/account/server/access';
import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getRootClassName } from '@gravity-ui/uikit/server';
import { brandName } from '@persons/assets/brand';
import { uiFont } from '@/shared/theme/fonts';
import { defaultMessages } from '@/shared/i18n/messages';
import { LocalizedContent } from '@/app/_providers/LocalizedContent/LocalizedContent';
import { AppProviders } from '@/app/_providers/AppProviders/AppProviders';
import { HeaderSkeleton } from '@/shared/ui/HeaderSkeleton/HeaderSkeleton';
import { PersonScreen } from '@/modules/landing/screens/PersonScreen/PersonScreen';
import { YandexMetrika } from '@persons/ui/analytics/YandexMetrika';
import { getServerConfig } from '@/shared/config/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'landing' });

    return { title: `${brandName} · ${t('pageTitle')}` };
}

export default async function LocaleLayout({
    children,
    params,
}: {
    readonly children: ReactNode;
    readonly params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    if (locale !== 'ru' && locale !== 'en') {
        notFound();
    }

    setRequestLocale(locale);
    await guardAccount(locale);
    const store = await cookies();
    const choice = store.get('PERSONS_THEME')?.value;
    const preference = choice === 'light' || choice === 'dark' ? choice : 'system';
    const systemTheme = store.get('PERSONS_SYSTEM_THEME')?.value === 'dark' ? 'dark' : 'light';
    const theme = preference === 'system' ? systemTheme : preference;
    const config = getServerConfig();

    return (
        <html lang={locale} className={`${getRootClassName({ theme })} ${uiFont.variable}`}>
            <body>
                <Suspense fallback={null}>
                    <YandexMetrika enabled={config.profile === 'prod'} publicUrl={config.publicUrl} />
                </Suspense>
                <Suspense
                    fallback={
                        <AppProviders
                            locale={locale}
                            messages={defaultMessages[locale]}
                            preference={preference}
                            resolvedTheme={theme}
                        >
                            <PersonScreen account={<HeaderSkeleton />} loading />
                        </AppProviders>
                    }
                >
                    <LocalizedContent locale={locale} preference={preference} resolvedTheme={theme}>
                        {children}
                    </LocalizedContent>
                </Suspense>
            </body>
        </html>
    );
}
