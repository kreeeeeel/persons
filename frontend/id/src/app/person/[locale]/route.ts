import { NextResponse } from 'next/server';
import { getServerConfig } from '@/shared/config/server';

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;

    return NextResponse.redirect(new URL(`/${locale === 'en' ? 'en' : 'ru'}`, getServerConfig().personPublicUrl));
}
