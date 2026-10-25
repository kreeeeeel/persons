'use server';

import { cookies } from 'next/headers';
import { ResponseError } from '@persons/id-client';
import { idApi } from '@/shared/api/server';
import { clearSession } from '@/shared/auth/session';

const SESSION_COOKIE = 'PERSONS_SESSION';

export async function signOut(): Promise<{ ok: boolean }> {
    const store = await cookies();

    try {
        if (store.has(SESSION_COOKIE)) {
            const api = await idApi();
            const sessions = await api.listSessions();
            const current = sessions.items.find((session) => session.current);

            if (current) {
                await api.revokeSession({ id: current.id });
            }
        }
    } catch (error) {
        if (!(error instanceof ResponseError) || ![401, 403].includes(error.response.status)) {
            return { ok: false };
        }
    }

    await clearSession();

    return { ok: true };
}
