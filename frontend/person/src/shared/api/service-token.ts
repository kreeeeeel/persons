import { createHmac, randomUUID } from 'node:crypto';

const MILLISECONDS_PER_SECOND = 1000;
const HS256 = 'HS256';
const JWT = 'JWT';
const INTERNAL_TOKEN_TTL_SECONDS = 60;

export function issueServiceToken(secret: string) {
    const issuedAt = Math.floor(Date.now() / MILLISECONDS_PER_SECOND);
    const header = Buffer.from(JSON.stringify({ alg: HS256, typ: JWT })).toString('base64url');
    const payload = Buffer.from(
        JSON.stringify({
            iss: 'persons',
            sub: 'person-web',
            aud: 'persons-internal',
            scope: 'service',
            iat: issuedAt,
            exp: issuedAt + INTERNAL_TOKEN_TTL_SECONDS,
            jti: randomUUID(),
        }),
    ).toString('base64url');
    const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');

    return `${header}.${payload}.${signature}`;
}
