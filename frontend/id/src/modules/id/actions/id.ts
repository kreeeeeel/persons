'use server';

import type { Register, Recovery, Credentials, Challenge } from '@persons/id-client';
import { clearSession, saveSession } from '@/shared/auth/session';
import { cookies } from 'next/headers';
import { idApi, safeError } from '@/shared/api/server';
import { getServerConfig } from '@/shared/config/server';
import {
    registrationSchema,
    credentialsSchema,
    recoverySchema,
    verificationSchema,
    completionSchema,
} from '@/modules/id/model/validation';
import type { ActionResult, BrowserChallenge } from '@/modules/id/model/ActionResult';

const PERSONS_GRANT = 'PERSONS_GRANT';
const INVALID_INPUT = 'INVALID_INPUT';
const EXPIRED_CHALLENGE = 'EXPIRED_CHALLENGE';

function serialize(challenge: Challenge): BrowserChallenge {
    return {
        ...challenge,
        expiresAt: challenge.expiresAt.toISOString(),
        resendAt: challenge.resendAt.toISOString(),
    };
}

export async function beginRegistration(input: Register): Promise<ActionResult<BrowserChallenge>> {
    const parsed = registrationSchema.safeParse(input);

    if (!parsed.success) {
        return { ok: false, code: INVALID_INPUT };
    }

    try {
        const result = await (await idApi()).beginRegistration({ register: parsed.data });

        return { ok: true, data: serialize(result) };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}

export async function beginRecovery(input: Recovery): Promise<ActionResult<BrowserChallenge>> {
    const parsed = recoverySchema.safeParse(input);

    if (!parsed.success) {
        return { ok: false, code: INVALID_INPUT };
    }

    try {
        return {
            ok: true,
            data: serialize(await (await idApi()).beginRecovery({ recovery: parsed.data })),
        };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}

export async function signIn(input: Credentials): Promise<ActionResult> {
    const parsed = credentialsSchema.safeParse(input);

    if (!parsed.success) {
        return { ok: false, code: INVALID_INPUT };
    }

    try {
        await saveSession(await (await idApi()).createSession({ credentials: parsed.data }));

        return { ok: true, data: undefined };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}

export async function verifyCode(id: string, code: string): Promise<ActionResult> {
    const parsed = verificationSchema.safeParse({ id, code });

    if (!parsed.success) {
        return { ok: false, code: INVALID_INPUT };
    }

    try {
        const result = await (await idApi()).verifyChallenge({ id, verify: { code } });

        (await cookies()).set(PERSONS_GRANT, JSON.stringify({ id, grant: result.grant }), {
            httpOnly: true,
            secure: getServerConfig().secureCookies,
            sameSite: 'strict',
            path: '/',
            expires: result.expiresAt,
        });

        return { ok: true, data: undefined };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}

export async function resendCode(id: string): Promise<ActionResult<BrowserChallenge>> {
    if (!verificationSchema.shape.id.safeParse(id).success) {
        return { ok: false, code: INVALID_INPUT };
    }

    try {
        (await cookies()).delete(PERSONS_GRANT);

        return { ok: true, data: serialize(await (await idApi()).resendChallenge({ id })) };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}

export async function finishRegistration(
    input: { password: string; avatarBase64?: string },
    recovery: boolean,
): Promise<ActionResult> {
    const parsed = completionSchema.safeParse(input);

    if (!parsed.success) {
        return { ok: false, code: INVALID_INPUT };
    }

    try {
        const raw = (await cookies()).get(PERSONS_GRANT)?.value;
        const grant: unknown = raw ? JSON.parse(raw) : null;

        if (
            typeof grant !== 'object' ||
            grant === null ||
            !('id' in grant) ||
            typeof grant.id !== 'string' ||
            !('grant' in grant) ||
            typeof grant.grant !== 'string'
        ) {
            return { ok: false, code: EXPIRED_CHALLENGE };
        }

        const api = await idApi();

        if (recovery) {
            await api.completeRecovery({
                completeRecovery: {
                    challengeId: grant.id,
                    grant: grant.grant,
                    password: parsed.data.password,
                },
            });
            (await cookies()).delete(PERSONS_GRANT);
            await clearSession();
        } else {
            await saveSession(
                await api.completeRegistration({
                    completeRegistration: {
                        challengeId: grant.id,
                        grant: grant.grant,
                        ...parsed.data,
                    },
                }),
            );
        }

        return { ok: true, data: undefined };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}

export async function signOut(): Promise<ActionResult> {
    try {
        const api = await idApi();
        const sessions = await api.listSessions();
        const current = sessions.items.find((session) => session.current);

        if (current) {
            await api.revokeSession({ id: current.id });
        }

        await clearSession();

        return { ok: true, data: undefined };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}

export async function revokeSession(id: string): Promise<ActionResult> {
    if (!verificationSchema.shape.id.safeParse(id).success) {
        return { ok: false, code: INVALID_INPUT };
    }

    try {
        await (await idApi()).revokeSession({ id });

        return { ok: true, data: undefined };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}
