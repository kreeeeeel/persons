import { cookies } from 'next/headers';
import { handlePersonRequest } from '@persons/person-domain/api/server';
import { getServerConfig } from '@/shared/config/server';
import { issueServiceToken } from '@/shared/api/internal-token';

async function handler(request: Request, context: { params: Promise<{ path: string[] }> }) {
    const { path } = await context.params;
    const config = getServerConfig();

    return handlePersonRequest(request, path, {
        ...config,
        serviceToken: issueServiceToken(config.internalJwtSecret),
        sessionToken: (await cookies()).get('PERSONS_SESSION')?.value,
    });
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
