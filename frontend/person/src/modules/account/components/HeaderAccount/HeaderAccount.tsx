import { currentUser } from '@/modules/account/server/currentUser';
import { getServerConfig } from '@/shared/config/server';
import { AccountMenu } from '@/modules/account/components/AccountMenu/AccountMenu';
import { AccountUnavailable } from '@/modules/account/components/AccountUnavailable/AccountUnavailable';
import { SignInButton } from '@/modules/account/components/SignInButton/SignInButton';

export async function HeaderAccount({ locale, tag }: { readonly locale: string; readonly tag?: string }) {
    const config = getServerConfig();
    let user;

    try {
        user = await currentUser();
    } catch {
        return <AccountUnavailable />;
    }

    if (!user) {
        const href = new URL(`/${locale}`, config.idPublicUrl);
        href.searchParams.set('returnTo', `/person/${locale}${tag ? `/${tag}` : ''}`);

        return <SignInButton href={href.href} />;
    }

    return (
        <AccountMenu
            user={user}
            profileHref={`/${locale}/my-page`}
            adminHref={new URL(`/${locale}`, config.adminPublicUrl).href}
        />
    );
}
