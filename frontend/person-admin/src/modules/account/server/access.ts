import 'server-only';
import type { RestrictionState } from '@persons/person-client';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { personApi } from '@/shared/api/person';

export const accountAccess = cache(async (): Promise<RestrictionState> => {
    if (!(await cookies()).has('PERSONS_SESSION')) {
        return { signedIn: false };
    }
    return (await personApi()).restrictions.getAccessState();
});

export async function guardAccount(locale: string): Promise<void> {
    const state = await accountAccess();
    const pathname = (await headers()).get('x-persons-pathname');
    if (state.restriction?.scopes.includes('ACCOUNT') && !['/blocked', `/${locale}/blocked`].includes(pathname ?? '')) {
        redirect(`/${locale}/blocked`);
    }
}
