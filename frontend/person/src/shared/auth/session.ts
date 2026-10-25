import 'server-only';

import type { SessionToken } from '@persons/id-client';
import { cookies } from 'next/headers';
import { getServerConfig } from '@/shared/config/server';

const SESSION_COOKIE = 'PERSONS_SESSION';

function sessionOptions() {
    const config = getServerConfig();
    return {
        httpOnly: true,
        secure: config.secureCookies,
        domain: config.sessionCookieDomain,
        sameSite: 'lax' as const,
        path: '/',
    };
}

export async function saveSession(session: SessionToken, options: { readonly clearRegistrationGrant?: boolean } = {}) {
    const store = await cookies();

    store.set(SESSION_COOKIE, session.token, {
        ...sessionOptions(),
        expires: session.expiresAt,
    });
    if (options.clearRegistrationGrant !== false) {
        store.delete('PERSONS_GRANT');
    }
}

export async function clearSession() {
    const store = await cookies();
    store.set(SESSION_COOKIE, '', {
        ...sessionOptions(),
        expires: new Date(0),
        maxAge: 0,
    });
}
