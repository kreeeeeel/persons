import { dynamicPropertyProxy } from '@/shared/dynamicProperties/server';
import { currentUser } from '@/modules/account/server/currentUser';
import { getServerConfig } from '@/shared/config/server';
import { getMessages } from 'next-intl/server';
import { AppProviders } from '@/app/_providers/AppProviders/AppProviders';
import type { AppProvidersProps } from '@/app/_providers/AppProviders/AppProviders.types';
import { PageShell } from '@/shared/ui/PageShell/PageShell';
import { AccessGate } from '@/modules/users/components/AccessGate/AccessGate';

export async function LocalizedContent(props: Omit<AppProvidersProps, 'messages'>) {
    const [ru, en] = await Promise.all([getMessages({ locale: 'ru' }), getMessages({ locale: 'en' })]);
    const user = await currentUser();
    const profileHref = new URL(`/${props.locale}/my-page`, getServerConfig().personPublicUrl).href;
    const catalogs = { ru, en };
    await dynamicPropertyProxy.initialize();
    const signInUrl = new URL(`/${props.locale}`, getServerConfig().idPublicUrl);
    signInUrl.searchParams.set('returnTo', `/admin/${props.locale}`);

    return (
        <AppProviders
            initialDynamicProperties={dynamicPropertyProxy.snapshot()}
            {...props}
            messages={catalogs[props.locale]}
            catalogs={catalogs}
        >
            {user?.role === 'ADMIN' ? (
                <PageShell user={user} profileHref={profileHref} publicUrl={getServerConfig().personPublicUrl}>
                    {props.children}
                </PageShell>
            ) : (
                <AccessGate
                    signedIn={Boolean(user)}
                    signInUrl={signInUrl.href}
                    publicUrl={new URL(`/${props.locale}`, getServerConfig().personPublicUrl).href}
                />
            )}
        </AppProviders>
    );
}
