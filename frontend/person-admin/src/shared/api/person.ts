import 'server-only';

import { cookies } from 'next/headers';
import { serverPersonClients } from '@persons/person-domain/api/server';
import { getServerConfig } from '@/shared/config/server';
import { issueServiceToken } from '@/shared/api/internal-token';

export async function personApi() {
    const config = getServerConfig();

    return serverPersonClients({
        ...config,
        serviceToken: issueServiceToken(config.internalJwtSecret),
        sessionToken: (await cookies()).get('PERSONS_SESSION')?.value,
    });
}
