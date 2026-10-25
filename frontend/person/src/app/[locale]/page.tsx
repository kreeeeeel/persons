import { Suspense } from 'react';
import { HeaderAccount } from '@/modules/account/components/HeaderAccount/HeaderAccount';
import { HeaderSkeleton } from '@/shared/ui/HeaderSkeleton/HeaderSkeleton';
import { PersonScreen } from '@/modules/landing/screens/PersonScreen/PersonScreen';
import { currentUser } from '@/modules/account/server/currentUser';

export default async function PersonPage({ params }: { readonly params: Promise<{ locale: string }> }) {
    const [{ locale }, user] = await Promise.all([params, currentUser()]);

    return (
        <PersonScreen
            signedIn={Boolean(user)}
            account={
                <Suspense fallback={<HeaderSkeleton />}>
                    <HeaderAccount locale={locale} />
                </Suspense>
            }
        />
    );
}
