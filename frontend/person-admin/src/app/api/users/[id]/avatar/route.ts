import { ResponseError } from '@persons/person-client';
import { z } from 'zod';
import { currentUser } from '@/modules/account/server/currentUser';
import { safeError } from '@/shared/api/server';
import { adminApi } from '@/modules/users/server/api';

const AVATAR_HEADERS = {
    'Content-Type': 'image/jpeg',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await currentUser();
        if (!user || user.role !== 'ADMIN') {
            return new Response(null, { status: user ? 403 : 401, headers: AVATAR_HEADERS });
        }

        const { id } = await context.params;
        if (!z.uuid().safeParse(id).success) {
            return new Response(null, { status: 400, headers: AVATAR_HEADERS });
        }

        const avatar = await (await adminApi()).getAdminUserAvatar({ id });
        return new Response(avatar, { headers: AVATAR_HEADERS });
    } catch (error) {
        if (error instanceof ResponseError && [401, 403, 404].includes(error.response.status)) {
            return new Response(null, { status: error.response.status, headers: AVATAR_HEADERS });
        }

        await safeError(error);
        return new Response(null, { status: 503, headers: AVATAR_HEADERS });
    }
}
