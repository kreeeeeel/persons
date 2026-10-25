'use server';
import { idApi, safeError } from '@/shared/api/server';
import type { AccountActionResult as ActionResult } from '@/modules/account/model/AccountActionResult';
import type { EmailChallenge } from '@/modules/account/model/EmailChallenge';
import { emailChangeSchema, passwordChangeSchema } from '@/modules/account/model/settingsValidation';
import { z } from 'zod';
const idSchema = z.uuid();
const INVALID_INPUT = 'INVALID_INPUT';
const FIRST_ISSUE_PATH_INDEX = 0;
const PASSWORD_MISMATCH = 'PASSWORD_MISMATCH';
export async function beginEmailChange(input: {
    email: string;
    currentPassword: string;
    locale: string;
}): Promise<ActionResult<EmailChallenge>> {
    const parsed = emailChangeSchema.safeParse(input);

    if (!parsed.success) {
        return { ok: false, code: INVALID_INPUT };
    }

    try {
        const result = await (await idApi()).beginEmailChange({ beginEmailChange: parsed.data });

        return {
            ok: true,
            data: {
                ...result,
                expiresAt: result.expiresAt.toISOString(),
                resendAt: result.resendAt.toISOString(),
            },
        };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}

export async function confirmEmailChange(id: string, code: string): Promise<ActionResult> {
    if (!idSchema.safeParse(id).success || !/^\d{6}$/.test(code)) {
        return { ok: false, code: INVALID_INPUT };
    }

    try {
        const api = await idApi();
        const verification = await api.verifyChallenge({ id, verify: { code } });

        await api.completeEmailChange({
            completeEmailChange: { challengeId: id, grant: verification.grant },
        });

        return { ok: true, data: undefined };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}

export async function resendEmailCode(id: string): Promise<ActionResult<EmailChallenge>> {
    if (!idSchema.safeParse(id).success) {
        return { ok: false, code: INVALID_INPUT };
    }

    try {
        const api = await idApi();

        await api.getMe();

        const result = await api.resendChallenge({ id });

        return {
            ok: true,
            data: {
                ...result,
                expiresAt: result.expiresAt.toISOString(),
                resendAt: result.resendAt.toISOString(),
            },
        };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}

export async function changePassword(input: {
    currentPassword: string;
    password: string;
    confirmation: string;
}): Promise<ActionResult> {
    const parsed = passwordChangeSchema.safeParse(input);

    if (!parsed.success) {
        return {
            ok: false,
            code: parsed.error.issues.some((issue) => issue.path[FIRST_ISSUE_PATH_INDEX] === 'confirmation')
                ? PASSWORD_MISMATCH
                : INVALID_INPUT,
        };
    }

    try {
        await (
            await idApi()
        ).changePassword({
            changePassword: {
                currentPassword: parsed.data.currentPassword,
                password: parsed.data.password,
            },
        });

        return { ok: true, data: undefined };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}

export async function changeProfile(input: {
    firstName: string;
    lastName: string;
    patronymic?: string;
}): Promise<ActionResult> {
    const name = z.string().trim().min(1).max(10);
    const parsed = z
        .object({
            firstName: name,
            lastName: name,
            patronymic: z.string().trim().max(10).optional(),
        })
        .safeParse(input);

    if (!parsed.success) {
        return { ok: false, code: INVALID_INPUT };
    }

    try {
        await (await idApi()).changeProfile({ changeProfile: parsed.data });
        return { ok: true, data: undefined };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}
