import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ContentPage } from '@/shared/ui/ContentPage/ContentPage';
import { HeaderAccount } from '@/modules/account/components/HeaderAccount/HeaderAccount';
import { HeaderSkeleton } from '@/shared/ui/HeaderSkeleton/HeaderSkeleton';
import { PublicationsScreen } from '@/modules/publications/screens/PublicationsScreen/PublicationsScreen';
import { getServerConfig } from '@/shared/config/server';
import { currentUser } from '@/modules/account/server/currentUser';
import { personApi } from '@/shared/api/person';

export async function generateMetadata({ params }: { readonly params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'publications' });
    return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function Page({ params }: { readonly params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    if (!(await currentUser())) {
        const signIn = new URL(`/${locale}`, getServerConfig().idPublicUrl);
        signIn.searchParams.set('returnTo', `/person/${locale}/my-publications`);
        redirect(signIn.href);
    }
    return (
        <ContentPage
            showSearch
            account={
                <Suspense fallback={<HeaderSkeleton />}>
                    <HeaderAccount locale={locale} />
                </Suspense>
            }
        >
            <PublicationsScreen author={await (await personApi()).publications.getMyPublicAuthor()} signedIn />
        </ContentPage>
    );
}
