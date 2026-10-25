import type { NextApiRequest, NextApiResponse } from 'next';
import { proxyMediaUpload } from '@persons/person-domain/api/proxyMediaUpload';
import { getServerConfig } from '@/shared/config/runtime';
import { issueServiceToken } from '@/shared/api/service-token';

export const config = { api: { bodyParser: false, responseLimit: false } };

export default async function upload(request: NextApiRequest, response: NextApiResponse) {
    const configuration = getServerConfig();
    await proxyMediaUpload(request, response, request.query.id, {
        ...configuration,
        serviceToken: issueServiceToken(configuration.internalJwtSecret),
        sessionToken: request.cookies.PERSONS_SESSION,
    });
}
