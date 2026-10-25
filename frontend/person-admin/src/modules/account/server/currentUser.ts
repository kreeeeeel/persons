import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { ResponseError } from '@persons/id-client';
import { idApi } from '@/shared/api/server';
import type { HeaderUser } from '@/modules/account/model/HeaderUser';

export const currentUser = cache(async (): Promise<HeaderUser | null> => {
    if (!(await cookies()).has('PERSONS_SESSION')) {
        return null;
    }

    try {
        const user = await (await idApi()).getMe();

        return {
            role: user.role,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            patronymic: user.patronymic,
            hasAvatar: user.hasAvatar,
        };
    } catch (error) {
        if (error instanceof ResponseError && [401, 403].includes(error.response.status)) {
            return null;
        }

        throw error;
    }
});
