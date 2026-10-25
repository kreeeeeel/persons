import { Suspense } from 'react';
import { getProfile } from '@/modules/profile/server/profile';
import { ProfileScreen } from '@/modules/profile/components/ProfileScreen/ProfileScreen';
import { currentUser } from '@/modules/account/server/currentUser';
import { HeaderAccount } from '@/modules/account/components/HeaderAccount/HeaderAccount';
import { HeaderSkeleton } from '@/shared/ui/HeaderSkeleton/HeaderSkeleton';
import { getServerConfig } from '@/shared/config/server';

export async function generateMetadata({ params }: { readonly params: Promise<{ tag: string }> }) {
    const { tag } = await params;
    const profile = await getProfile(tag);

    return {
        title: `${profile.fullName} · Те ещё люди.`,
        description: profile.description,
        alternates: { canonical: `/${profile.tag}` },
    };
}

export default async function ProfilePage({
    params,
    searchParams,
}: {
    readonly params: Promise<{ locale: string; tag: string }>;
    readonly searchParams: Promise<{ preview?: string }>;
}) {
    const { locale, tag } = await params;
    const { preview } = await searchParams;
    const integrationsPreview = getServerConfig().profile !== 'prod' && preview === 'integrations';
    const [profile, user] = await Promise.all([getProfile(tag), currentUser()]);

    return (
        <ProfileScreen
            key={`${profile.id}:${integrationsPreview}`}
            profile={profile}
            integrationsPreview={integrationsPreview}
            signedIn={Boolean(user)}
            administrator={user?.role === 'ADMIN'}
            account={
                <Suspense fallback={<HeaderSkeleton />}>
                    <HeaderAccount locale={locale} tag={tag} />
                </Suspense>
            }
        />
    );
}
