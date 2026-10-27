import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ResponseError } from '@persons/person-client';
import { getTranslations } from 'next-intl/server';
import { ContentPage } from '@/shared/ui/ContentPage/ContentPage';
import { HeaderAccount } from '@/modules/account/components/HeaderAccount/HeaderAccount';
import { HeaderSkeleton } from '@/shared/ui/HeaderSkeleton/HeaderSkeleton';
import { PublicationsScreen } from '@/modules/publications/screens/PublicationsScreen/PublicationsScreen';
import { personApi } from '@/shared/api/person';
import { currentUser } from '@/modules/account/server/currentUser';

export async function generateMetadata({ params }: { readonly params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'publications' });
    return { title: t('publicTitle'), robots: { index: false, follow: false } };
}

export default async function Page({ params }: { readonly params: Promise<{ locale: string; handle: string }> }) {
    const { locale, handle } = await params;
    const api = await personApi();
    let author;
    try {
        author = await api.publications.getPublicAuthor({ handle });
    } catch (error) {
        if (error instanceof ResponseError && error.response.status === 404) {
            notFound();
        }
        throw error;
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
            <PublicationsScreen author={author} handle={handle} signedIn={!!(await currentUser())} />
        </ContentPage>
    );
}
