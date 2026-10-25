'use server';

import { clearSession } from '@/shared/auth/session';
import { idApi, safeError } from '@/shared/api/server';
import type { AccountActionResult } from '@/modules/account/model/AccountActionResult';
import type { SessionView } from '@/modules/account/model/SessionView';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listAccountSessions(): Promise<AccountActionResult<SessionView[]>> {
    try {
        const { items } = await (await idApi()).listSessions();

        return {
            ok: true,
            data: items.map((item) => ({
                ...item,
                createdAt: item.createdAt.toISOString(),
                lastSeenAt: item.lastSeenAt.toISOString(),
                expiresAt: item.expiresAt.toISOString(),
            })),
        };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}

export async function endAccountSession(id: string): Promise<AccountActionResult<{ readonly current: boolean }>> {
    if (!UUID_PATTERN.test(id)) {
        return { ok: false, code: 'INVALID_INPUT' };
    }

    try {
        const api = await idApi();
        const sessions = await api.listSessions();
        const target = sessions.items.find((item) => item.id === id);

        if (!target) {
            return { ok: false, code: 'INVALID_INPUT' };
        }

        await api.revokeSession({ id });
        if (target.current) {
            await clearSession();
        }

        return { ok: true, data: { current: target.current } };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}

export async function endOtherAccountSessions(): Promise<AccountActionResult> {
    try {
        await (await idApi()).revokeOtherSessions();

        return { ok: true, data: undefined };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}
