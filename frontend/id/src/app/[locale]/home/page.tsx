import { redirect } from 'next/navigation';
import { ResponseError } from '@persons/id-client';
import { idApi } from '@/shared/api/server';
import { AccountScreen } from '@/modules/account/screens/AccountScreen/AccountScreen';

export default async function Home({ params }: { readonly params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const api = await idApi();
    let user;
    let sessions;

    try {
        [user, sessions] = await Promise.all([api.getMe(), api.listSessions()]);
    } catch (error) {
        if (error instanceof ResponseError && error.response.status === 401) {
            redirect(`/${locale}`);
        }

        throw error;
    }

    return (
        <AccountScreen
            user={user}
            sessions={sessions.items.map((item) => ({
                ...item,
                createdAt: item.createdAt.toISOString(),
                lastSeenAt: item.lastSeenAt.toISOString(),
                expiresAt: item.expiresAt.toISOString(),
            }))}
        />
    );
}
