import type { ReactNode } from 'react';
import { ResponseError } from '@persons/id-client';
import { idApi } from '@/shared/api/server';
import { getServerConfig } from '@/shared/config/server';
import { AccessGate } from '@/modules/users/components/AccessGate/AccessGate';

export async function AdminOnly({ children, locale }: { readonly children: ReactNode; readonly locale: string }) {
    const url = new URL(`/${locale}`, getServerConfig().idPublicUrl);
    url.searchParams.set('returnTo', `/admin/${locale}`);
    let user;

    try {
        user = await (await idApi()).getMe();
    } catch (error) {
        if (error instanceof ResponseError && [401, 403].includes(error.response.status)) {
            return <AccessGate signInUrl={url.href} signedIn={false} />;
        }

        throw error;
    }

    return user.role === 'ADMIN' ? children : <AccessGate signInUrl={url.href} signedIn />;
}
