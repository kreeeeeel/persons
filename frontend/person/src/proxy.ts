import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/shared/i18n/routing';

const localize = createMiddleware(routing);

export default function proxy(request: NextRequest) {
    const supplied = request.headers.get('x-request-id') ?? '';
    const requestId = /^[a-zA-Z0-9_-]{1,64}$/.test(supplied) ? supplied : crypto.randomUUID();
    const headers = new Headers(request.headers);

    headers.set('x-request-id', requestId);
    headers.set('x-persons-pathname', request.nextUrl.pathname);

    const tag = request.nextUrl.pathname.slice(1);

    if (/^[a-z][a-z0-9-]{1,31}$/.test(tag) && tag !== 'ru' && tag !== 'en') {
        const locale = request.cookies.get('PERSONS_LOCALE')?.value === 'en' ? 'en' : 'ru';
        const destination = request.nextUrl.clone();
        destination.pathname = ['my-page', 'blocked'].includes(tag) ? `/${locale}/${tag}` : `/${locale}/person/${tag}`;
        headers.set('x-next-intl-locale', locale);
        const response = NextResponse.rewrite(destination, { request: { headers } });
        response.headers.set('X-Request-ID', requestId);

        return response;
    }

    const forwarded = new NextRequest(request, { headers });
    const staticFile = request.nextUrl.pathname.split('/').at(-1)?.includes('.');
    const response =
        request.nextUrl.pathname.startsWith('/api/') || staticFile
            ? NextResponse.next({ request: { headers } })
            : localize(forwarded);

    response.headers.set('X-Request-ID', requestId);

    return response;
}

export const config = {
    matcher: [
        '/',
        '/(ru|en)/:path*',
        { source: '/api/:path*', missing: [{ type: 'header', key: 'content-type', value: 'multipart/form-data.*' }] },
        '/:tag',
    ],
};
