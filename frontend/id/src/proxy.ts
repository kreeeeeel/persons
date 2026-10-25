import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/shared/i18n/routing';

const localize = createMiddleware(routing);

export default function proxy(request: NextRequest) {
    const supplied = request.headers.get('x-request-id') ?? '';
    const requestId = /^[a-zA-Z0-9_-]{1,64}$/.test(supplied) ? supplied : crypto.randomUUID();
    const headers = new Headers(request.headers);

    headers.set('x-request-id', requestId);

    const forwarded = new NextRequest(request, { headers });
    const response = /^\/(api|legal)\//.test(request.nextUrl.pathname)
        ? NextResponse.next({ request: { headers } })
        : localize(forwarded);

    response.headers.set('X-Request-ID', requestId);

    return response;
}

export const config = { matcher: ['/', '/(ru|en)/:path*', '/api/:path*'] };
