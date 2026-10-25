import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerConfig } from '@/shared/config/server';
import { oauthApi, safeError } from '@/shared/api/server';
import { postSignInHref } from '@/modules/id/model/postSignInHref';
import { saveSession } from '@/shared/auth/session';

const bindingSchema = z.object({
    binding: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    locale: z.enum(['ru', 'en']),
    returnTo: z.string().optional(),
});

export async function GET(request: Request) {
    const config = getServerConfig();
    const store = await cookies();
    const raw = store.get('PERSONS_OAUTH')?.value;
    let locale = 'ru';
    let returnTo = '/ru/home';

    store.set('PERSONS_OAUTH', '', {
        path: '/api/oauth/yandex',
        maxAge: 0,
        httpOnly: true,
        secure: config.secureCookies,
        sameSite: 'lax',
    });

    try {
        const binding = bindingSchema.parse(raw ? JSON.parse(raw) : null);
        const query = new URL(request.url).searchParams;
        const code = query.get('code');
        const state = query.get('state');

        locale = binding.locale;
        returnTo = postSignInHref(locale, new URLSearchParams({ returnTo: binding.returnTo ?? '' }).toString());

        if (!code || !state || query.has('error')) {
            return NextResponse.redirect(
                new URL(
                    `/${locale}?oauthError=INVALID_OAUTH&returnTo=${encodeURIComponent(returnTo)}`,
                    config.publicUrl,
                ),
            );
        }

        const api = await oauthApi();
        const session = await api.completeOAuth({
            provider: 'yandex',
            oAuthComplete: { code, state, browserBinding: binding.binding },
        });

        await saveSession(session);

        return NextResponse.redirect(new URL(returnTo, config.publicUrl));
    } catch (error) {
        const code = await safeError(error);
        const safe = ['OAUTH_ACCOUNT_CONFLICT', 'FORBIDDEN', 'OAUTH_UNAVAILABLE'].includes(code)
            ? code
            : 'INVALID_OAUTH';

        return NextResponse.redirect(
            new URL(`/${locale}?oauthError=${safe}&returnTo=${encodeURIComponent(returnTo)}`, config.publicUrl),
        );
    }
}
