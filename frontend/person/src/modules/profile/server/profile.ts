import 'server-only';

import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { accountAccess } from '@/modules/account/server/access';
import { ResponseError } from '@persons/person-client';
import { personApi } from '@/shared/api/person';
import { militaryServiceToday } from '@/modules/profile/model/serviceCalendar';

export function profileToday() {
    return militaryServiceToday(Date.now());
}

export const getProfile = cache(async (tag: string) => {
    if ((await accountAccess()).restriction?.scopes.includes('ACCOUNT')) {
        redirect(`/${await getLocale()}/blocked`);
    }
    if (!/^[a-z][a-z0-9-]{1,31}$/.test(tag)) {
        notFound();
    }

    try {
        return await (await personApi()).persons.getPerson({ tag });
    } catch (error) {
        if (error instanceof ResponseError && error.response.status === 404) {
            notFound();
        }

        throw error;
    }
});
