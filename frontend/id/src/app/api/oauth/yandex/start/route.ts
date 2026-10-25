import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getServerConfig } from '@/shared/config/server';
import { oauthApi } from '@/shared/api/server';
import { postSignInHref } from '@/modules/id/model/postSignInHref';

export async function GET(request: Request) {
    const config = getServerConfig();
    const query = new URL(request.url).searchParams;
    const locale = query.get('locale') === 'en' ? 'en' : 'ru';
    const returnTo = postSignInHref(locale, query.toString());
    const binding = randomBytes(32).toString('base64url');
    const api = await oauthApi();

    try {
        const result = await api.beginOAuth({ provider: 'yandex', oAuthStart: { browserBinding: binding, locale } });

        (await cookies()).set('PERSONS_OAUTH', JSON.stringify({ binding, locale, returnTo }), {
            httpOnly: true,
            secure: config.secureCookies,
            sameSite: 'lax',
            path: '/api/oauth/yandex',
            maxAge: 600,
        });

        return NextResponse.redirect(result.authorizationUrl);
    } catch {
        return NextResponse.redirect(
            new URL(
                `/${locale}?oauthError=OAUTH_UNAVAILABLE&returnTo=${encodeURIComponent(returnTo)}`,
                config.publicUrl,
            ),
        );
    }
}
