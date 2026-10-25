import { cookies } from 'next/headers';
import { idApi, safeError } from '@/shared/api/server';
import { saveSession } from '@/shared/auth/session';
import { getServerConfig } from '@/shared/config/server';

export async function POST(request: Request) {
    if (request.headers.get('origin') !== new URL(getServerConfig().publicUrl).origin) {
        return new Response(null, { status: 403 });
    }
    const currentToken = (await cookies()).get('PERSONS_SESSION')?.value;
    if (!currentToken) {
        return new Response(null, { status: 204 });
    }
    try {
        const session = await (await idApi()).refreshSession();
        if (session.token !== currentToken) {
            await saveSession(session, { clearRegistrationGrant: false });
        }
        return Response.json(
            { expiresAt: session.expiresAt.toISOString() },
            { headers: { 'Cache-Control': 'private, no-store' } },
        );
    } catch (error) {
        const code = await safeError(error);
        return Response.json(
            { code },
            { status: code === 'UNAUTHORIZED' ? 401 : 503, headers: { 'Cache-Control': 'no-store' } },
        );
    }
}
