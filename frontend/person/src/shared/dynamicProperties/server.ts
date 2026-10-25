import 'server-only';

import { cookies } from 'next/headers';
import { createDynPropertyProxy } from '@persons/dynamic-properties/server';
import { getServerConfig } from '@/shared/config/server';
import { issueServiceToken } from '@/shared/api/internal-token';
import { dynamicProperties } from '@/shared/dynamicProperties/definitions';

export const dynamicPropertyProxy = createDynPropertyProxy(() => {
    const config = getServerConfig();
    return {
        url: config.dynamicPropertiesUrl,
        publicUrl: config.publicUrl,
        scope: 'frontend-person',
        properties: dynamicProperties,
        serviceToken: () => issueServiceToken(config.internalJwtSecret),
        sessionToken: async () => (await cookies()).get('PERSONS_SESSION')?.value,
    };
});
