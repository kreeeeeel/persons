import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ContentPage } from '@/shared/ui/ContentPage/ContentPage';
import { HeaderAccount } from '@/modules/account/components/HeaderAccount/HeaderAccount';
import { HeaderSkeleton } from '@/shared/ui/HeaderSkeleton/HeaderSkeleton';
import { FeedScreen } from '@/modules/feed/screens/FeedScreen/FeedScreen';
import { getServerConfig } from '@/shared/config/server';
import { currentUser } from '@/modules/account/server/currentUser';
import { personApi } from '@/shared/api/person';

export async function generateMetadata({ params }: { readonly params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'feed' });
    return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function Page({ params }: { readonly params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const signIn = new URL(`/${locale}`, getServerConfig().idPublicUrl);
    signIn.searchParams.set('returnTo', `/person/${locale}/feed`);
    const user = await currentUser();
    if (!user) {
        redirect(signIn.href);
    }
    const mine = await (await personApi()).persons.getMyPerson();
    return (
        <ContentPage
            showSearch
            account={
                <Suspense fallback={<HeaderSkeleton />}>
                    <HeaderAccount locale={locale} />
                </Suspense>
            }
        >
            <FeedScreen ownPage={mine?.person} />
        </ContentPage>
    );
}
