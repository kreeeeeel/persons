import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { HeaderAccount } from '@/modules/account/components/HeaderAccount/HeaderAccount';
import { HeaderSkeleton } from '@/shared/ui/HeaderSkeleton/HeaderSkeleton';
import { ContentPage } from '@/shared/ui/ContentPage/ContentPage';
import { LegalScreen } from '@/modules/legal/screens/LegalScreen/LegalScreen';
import { getSiteSettings } from '@/shared/api/siteSettings';

export async function generateMetadata({ params }: { readonly params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'legal' });
    return { title: t('terms.title'), robots: { index: false, follow: false } };
}

export default async function Page({ params }: { readonly params: Promise<{ locale: string }> }) {
    const [{ locale }, settings] = await Promise.all([params, getSiteSettings()]);
    return (
        <ContentPage
            account={
                <Suspense fallback={<HeaderSkeleton />}>
                    <HeaderAccount locale={locale} />
                </Suspense>
            }
        >
            <LegalScreen kind="terms" settings={settings} />
        </ContentPage>
    );
}
