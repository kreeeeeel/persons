import 'server-only';

import { AccountsApi, Configuration } from '@persons/person-client';
import { issueServiceToken } from '@/shared/api/internal-token';
import { cookies } from 'next/headers';
import { getServerConfig } from '@/shared/config/server';

export async function adminApi() {
    const config = getServerConfig();

    return new AccountsApi(
        new Configuration({
            basePath: config.personUrl,
            headers: { 'X-Service-Authorization': `Bearer ${issueServiceToken(config.internalJwtSecret)}` },
            accessToken: (await cookies()).get('PERSONS_SESSION')?.value,
            fetchApi: (input, init) => fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(15000) }),
        }),
    );
}
