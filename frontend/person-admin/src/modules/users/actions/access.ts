'use server';

import { z } from 'zod';
import { ResponseError } from '@persons/person-client';
import { adminApi } from '@/modules/users/server/api';

const accessSchema = z.object({ id: z.uuid(), role: z.enum(['USER', 'ADMIN']), status: z.enum(['ACTIVE', 'BLOCKED']) });
const ALLOWED_CODES = ['FORBIDDEN', 'UNAUTHORIZED', 'USER_NOT_FOUND', 'LAST_ADMINISTRATOR', 'INVALID_INPUT'];

async function safeError(error: unknown): Promise<string> {
    if (error instanceof ResponseError) {
        const body: unknown = await error.response.json().catch(() => null);

        if (
            body &&
            typeof body === 'object' &&
            'code' in body &&
            typeof body.code === 'string' &&
            ALLOWED_CODES.includes(body.code)
        ) {
            return body.code;
        }
    }

    return 'UNAVAILABLE';
}

export async function updateAccess(input: unknown) {
    const parsed = accessSchema.safeParse(input);

    if (!parsed.success) {
        return { ok: false, code: 'INVALID_INPUT' };
    }

    try {
        const { id, role, status } = parsed.data;

        await (await adminApi()).updateUserAccess({ id, updateAccess: { role, status } });

        return { ok: true };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}

export async function revokeSessions(id: string) {
    if (!z.uuid().safeParse(id).success) {
        return { ok: false, code: 'INVALID_INPUT' };
    }

    try {
        await (await adminApi()).revokeUserSessions({ id });

        return { ok: true };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}
