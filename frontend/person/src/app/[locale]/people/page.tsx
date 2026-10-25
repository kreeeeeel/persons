import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { HeaderAccount } from '@/modules/account/components/HeaderAccount/HeaderAccount';
import { HeaderSkeleton } from '@/shared/ui/HeaderSkeleton/HeaderSkeleton';
import { ContentPage } from '@/shared/ui/ContentPage/ContentPage';
import { DirectoryScreen } from '@/modules/directory/screens/DirectoryScreen/DirectoryScreen';
import { getSiteSettings } from '@/shared/api/siteSettings';

export async function generateMetadata({ params }: { readonly params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'directory' });
    return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function Page({ params }: { readonly params: Promise<{ locale: string }> }) {
    const [{ locale }, settings] = await Promise.all([params, getSiteSettings()]);
    return (
        <ContentPage
            showSearch
            account={
                <Suspense fallback={<HeaderSkeleton />}>
                    <HeaderAccount locale={locale} />
                </Suspense>
            }
        >
            <DirectoryScreen settings={settings} />
        </ContentPage>
    );
}
