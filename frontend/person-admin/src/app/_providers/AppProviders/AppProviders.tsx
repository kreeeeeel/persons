'use client';
import { SessionRefresh } from '@persons/ui/auth/SessionRefresh';

import type { AppProvidersProps } from '@/app/_providers/AppProviders/AppProviders.types';
import { I18nProvider, useLocale, useTranslate } from '@persons/i18n';
import { LoadingFailureProvider } from '@persons/ui/loading/LoadingFailureProvider';
import { RestrictionFeedback } from '@persons/person-domain/RestrictionFeedback';
import { UploadQueueProvider } from '@persons/person-domain/UploadQueueProvider';
import { TagDictionaryProvider } from '@persons/person-domain/tags/TagDictionaryProvider';
import { PersonsThemeProvider } from '@persons/theme';
import { DynPropertyProvider } from '@persons/dynamic-properties';
import { dynamicProperties } from '@/shared/dynamicProperties/definitions';

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
                <RestrictionFeedback>
                    <TagDictionaryProvider>
                        <UploadQueueProvider>{children}</UploadQueueProvider>
                    </TagDictionaryProvider>
                </RestrictionFeedback>
            </LoadingFailureProvider>
        </PersonsThemeProvider>
    );
}

export function AppProviders({
    children,
    locale,
    messages,
    catalogs,
    preference,
    resolvedTheme,
    initialDynamicProperties,
}: AppProvidersProps) {
    return (
        <I18nProvider locale={locale} messages={messages} catalogs={catalogs}>
            <DynPropertyProvider
                url="/api/dynamic-properties"
                properties={dynamicProperties}
                initialValues={initialDynamicProperties}
            >
                <LoadingFeedback preference={preference} resolvedTheme={resolvedTheme}>
                    {children}
                </LoadingFeedback>
            </DynPropertyProvider>
        </I18nProvider>
    );
}
