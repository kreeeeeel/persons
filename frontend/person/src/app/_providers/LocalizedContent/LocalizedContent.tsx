import { dynamicPropertyProxy } from '@/shared/dynamicProperties/server';
import { getMessages } from 'next-intl/server';
import { AppProviders } from '@/app/_providers/AppProviders/AppProviders';
import type { AppProvidersProps } from '@/app/_providers/AppProviders/AppProviders.types';
import { CookieNotice } from '@/shared/ui/CookieNotice/CookieNotice';
import { SiteNotices } from '@/shared/ui/SiteNotices/SiteNotices';

export async function LocalizedContent(props: Omit<AppProvidersProps, 'messages'>) {
    const [ru, en] = await Promise.all([getMessages({ locale: 'ru' }), getMessages({ locale: 'en' })]);
    const catalogs = { ru, en };
    await dynamicPropertyProxy.initialize();

    return (
        <AppProviders
            initialDynamicProperties={dynamicPropertyProxy.snapshot()}
            {...props}
            messages={catalogs[props.locale]}
            catalogs={catalogs}
        >
            {props.children}
            <SiteNotices />
            <CookieNotice />
        </AppProviders>
    );
}
