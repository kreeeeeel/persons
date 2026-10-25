'use server';

import { idApi, safeError } from '@/shared/api/server';
import type { AccountActionResult } from '@/modules/account/model/AccountActionResult';

const MAX_AVATAR_LENGTH = 400023;
const JPEG_DATA_URL = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;

export async function changeAvatar(avatarBase64: string): Promise<AccountActionResult> {
    if (
        typeof avatarBase64 !== 'string' ||
        avatarBase64.length > MAX_AVATAR_LENGTH ||
        !JPEG_DATA_URL.test(avatarBase64)
    ) {
        return { ok: false, code: 'INVALID_AVATAR' };
    }

    try {
        await (await idApi()).changeAvatar({ changeAvatar: { avatarBase64 } });
        return { ok: true, data: undefined };
    } catch (error) {
        return { ok: false, code: await safeError(error) };
    }
}
