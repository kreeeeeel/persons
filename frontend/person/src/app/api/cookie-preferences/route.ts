import { NextResponse } from 'next/server';
import { COOKIE_PREFERENCE } from '@/shared/privacy/cookiePreferences';
import { getServerConfig } from '@/shared/config/server';

export async function POST(request: Request) {
    const config = getServerConfig();
    const url = new URL(config.publicUrl);
    if (request.headers.get('origin') !== url.origin) {
        return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
    }
    let choice: unknown;
    try {
        choice = ((await request.json()) as { choice?: unknown }).choice;
    } catch {
        return NextResponse.json({ code: 'INVALID_INPUT' }, { status: 400 });
    }
    if (choice !== 'accepted' && choice !== 'rejected') {
        return NextResponse.json({ code: 'INVALID_INPUT' }, { status: 400 });
    }
    const response = NextResponse.json({ choice }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(COOKIE_PREFERENCE, choice, {
        domain: config.sessionCookieDomain,
        path: '/',
        sameSite: 'lax',
        secure: url.protocol === 'https:',
        maxAge: 60 * 60 * 24 * 365,
    });
    if (choice === 'rejected') {
        response.cookies.set('PERSONS_VISITOR', '', {
            path: '/',
            maxAge: 0,
            httpOnly: true,
            sameSite: 'lax',
            secure: url.protocol === 'https:',
        });
    }
    return response;
}
