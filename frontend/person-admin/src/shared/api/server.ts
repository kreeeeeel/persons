import 'server-only';
import { issueServiceToken } from '@/shared/api/internal-token';

import { IdApi, Configuration, ResponseError } from '@persons/id-client';
import { cookies, headers } from 'next/headers';
import { userAgentFromString } from 'next/server';
import { getServerConfig } from '@/shared/config/server';

const PERSONS_SESSION = 'PERSONS_SESSION';
const PERSONS_LOCALE = 'PERSONS_LOCALE';
const X_CLIENT_IP_0 = 0;
const REQUEST_TIMEOUT_MILLIS = 10000;
const INVALID_INPUT = 'INVALID_INPUT';
const INVALID_CREDENTIALS = 'INVALID_CREDENTIALS';
const EMAIL_IN_USE = 'EMAIL_IN_USE';
const INVALID_CODE = 'INVALID_CODE';
const EXPIRED_CHALLENGE = 'EXPIRED_CHALLENGE';
const TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS';
const RESEND_TOO_EARLY = 'RESEND_TOO_EARLY';
const UNAUTHORIZED = 'UNAUTHORIZED';
const INVALID_AVATAR = 'INVALID_AVATAR';
const UNAVAILABLE = 'UNAVAILABLE';

export async function idApi() {
    const config = getServerConfig();
    const incoming = await headers();
    const cookieStore = await cookies();
    const token = cookieStore.get(PERSONS_SESSION)?.value;
    const agent = incoming.get('user-agent') ?? '';
    const parsed = userAgentFromString(agent);
    const incomingId = incoming.get('x-request-id') ?? '';
    const requestId = /^[a-zA-Z0-9_-]{1,64}$/.test(incomingId) ? incomingId : crypto.randomUUID();

    return new IdApi(
        new Configuration({
            basePath: config.idUrl,
            accessToken: token,
            headers: {
                'X-Service-Authorization': `Bearer ${issueServiceToken(config.internalJwtSecret)}`,
                'X-Request-ID': requestId,
                'User-Agent': agent,
                'Accept-Language': cookieStore.get(PERSONS_LOCALE)?.value === 'en' ? 'en' : 'ru',
                'X-Client-IP': config.trustProxy
                    ? (incoming.get('x-forwarded-for')?.split(',')[X_CLIENT_IP_0]?.trim() ?? '')
                    : '',
                'X-Client-OS': parsed.os.name ?? '',
                'X-Client-OS-Version': parsed.os.version ?? '',
                'X-Client-Browser': `${parsed.browser.name ?? ''} ${parsed.browser.version ?? ''}`.trim(),
                'X-Client-Device': parsed.device.type ?? 'desktop',
                'X-Client-Region': config.trustProxy ? (incoming.get('x-client-region') ?? '').slice(0, 160) : '',
                'X-Client-Origin': 'persons-cms-web',
            },
            fetchApi: (input, init) =>
                fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLIS) }),
        }),
    );
}

export async function safeError(error: unknown) {
    if (error instanceof ResponseError) {
        const body: unknown = await error.response.json().catch(() => null);

        if (typeof body === 'object' && body !== null && 'code' in body && typeof body.code === 'string') {
            const codes = [
                INVALID_INPUT,
                INVALID_CREDENTIALS,
                EMAIL_IN_USE,
                INVALID_CODE,
                EXPIRED_CHALLENGE,
                TOO_MANY_ATTEMPTS,
                RESEND_TOO_EARLY,
                UNAUTHORIZED,
                INVALID_AVATAR,
                'OAUTH_ACCOUNT_CONFLICT',
                'OAUTH_UNAVAILABLE',
                'FORBIDDEN',
                'INVALID_OAUTH',
            ];

            return codes.includes(body.code) ? body.code : UNAVAILABLE;
        }
    }

    console.error('Id backend request failed', {
        cause: error instanceof Error ? error.name : 'Unknown',
    });

    return UNAVAILABLE;
}
