import { NextResponse } from 'next/server';
import { getServerConfig } from '@/shared/config/server';

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; tag: string }> }) {
    const { locale, tag } = await params;

    if (!/^[a-z][a-z0-9-]{1,31}$/.test(tag) || !['ru', 'en'].includes(locale)) {
        return new NextResponse(null, { status: 404 });
    }

    const destination = tag === 'feed' ? `/${locale}/feed` : `/${tag}`;
    const response = NextResponse.redirect(new URL(destination, getServerConfig().personPublicUrl));
    response.cookies.set('PERSONS_LOCALE', locale, { path: '/', sameSite: 'lax', maxAge: 31536000 });

    return response;
}
