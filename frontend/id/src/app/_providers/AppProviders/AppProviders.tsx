'use client';
import { SessionRefresh } from '@persons/ui/auth/SessionRefresh';

import type { AppProvidersProps } from '@/app/_providers/AppProviders/AppProviders.types';
import { I18nProvider, useLocale, useTranslate } from '@persons/i18n';
import { LoadingFailureProvider } from '@persons/ui/loading/LoadingFailureProvider';
import { PersonsThemeProvider } from '@persons/theme';

function LoadingFeedback({
    children,
    preference,
    resolvedTheme,
}: Pick<AppProvidersProps, 'children' | 'preference' | 'resolvedTheme'>) {
    const t = useTranslate('common');
    const locale = useLocale();

    return (
        <PersonsThemeProvider locale={locale} preference={preference} resolvedTheme={resolvedTheme}>
            <SessionRefresh />
            <LoadingFailureProvider
                title={t('loadingErrorTitle')}
                description={t('loadingErrorDescription')}
                acknowledge={t('retry')}
                illustrationAlt={t('loadingErrorIllustration')}
                illustrationSrc="/media/error-modal-nikita-v1.webp"
            >
                {children}
            </LoadingFailureProvider>
        </PersonsThemeProvider>
    );
}

export function AppProviders({ children, locale, messages, catalogs, preference, resolvedTheme }: AppProvidersProps) {
    return (
        <I18nProvider locale={locale} messages={messages} catalogs={catalogs}>
            <LoadingFeedback preference={preference} resolvedTheme={resolvedTheme}>
                {children}
            </LoadingFeedback>
        </I18nProvider>
    );
}
