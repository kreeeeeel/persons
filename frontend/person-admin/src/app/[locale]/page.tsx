import { guardAccount } from '@/modules/account/server/access';
import { currentUser } from '@/modules/account/server/currentUser';
import { getServerConfig } from '@/shared/config/server';
import { UsersScreen } from '@/modules/users/screens/UsersScreen/UsersScreen';
import { AccessGate } from '@/modules/users/components/AccessGate/AccessGate';

export default async function Page({
    params,
    searchParams,
}: {
    readonly params: Promise<{ locale: string }>;
    readonly searchParams: Promise<{ page?: string; search?: string }>;
}) {
    const { locale } = await params;
    await guardAccount(locale);
    const query = await searchParams;
    const search = (query.search ?? '').slice(0, 254);
    const signInUrl = `${getServerConfig().idPublicUrl}/${locale}?returnTo=${encodeURIComponent(`/admin/${locale}`)}`;
    const user = await currentUser();
    if (!user) {
        return <AccessGate signInUrl={signInUrl} signedIn={false} />;
    }

    if (user.role !== 'ADMIN') {
        return <AccessGate signInUrl={signInUrl} signedIn />;
    }

    return <UsersScreen search={search} publicUrl={getServerConfig().personPublicUrl} />;
}
