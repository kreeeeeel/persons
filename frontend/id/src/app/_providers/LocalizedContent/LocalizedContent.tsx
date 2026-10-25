import { getMessages } from 'next-intl/server';
import { AppProviders } from '@/app/_providers/AppProviders/AppProviders';
import type { AppProvidersProps } from '@/app/_providers/AppProviders/AppProviders.types';
import { PageShell } from '@/shared/ui/PageShell/PageShell';

export async function LocalizedContent(props: Omit<AppProvidersProps, 'messages'>) {
    const [ru, en] = await Promise.all([getMessages({ locale: 'ru' }), getMessages({ locale: 'en' })]);
    const catalogs = { ru, en };

    return (
        <AppProviders {...props} messages={catalogs[props.locale]} catalogs={catalogs}>
            <PageShell>{props.children}</PageShell>
        </AppProviders>
    );
}
