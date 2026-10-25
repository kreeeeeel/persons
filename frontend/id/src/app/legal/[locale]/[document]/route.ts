import { NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { getServerConfig } from '@/shared/config/server';

export async function GET(
    _request: Request,
    { params }: { readonly params: Promise<{ locale: string; document: string }> },
) {
    const { locale, document } = await params;
    if (!['ru', 'en'].includes(locale) || !['privacy', 'terms'].includes(document)) {
        notFound();
    }
    return NextResponse.redirect(new URL(`/${locale}/${document}`, getServerConfig().personPublicUrl));
}
