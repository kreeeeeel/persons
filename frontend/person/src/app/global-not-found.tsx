import '@gravity-ui/uikit/styles/styles.css';
import '@/shared/styles/globals.css';
import '@/shared/styles/scrollbar.css';

import { cookies } from 'next/headers';
import { guardAccount } from '@/modules/account/server/access';
import { getRootClassName } from '@gravity-ui/uikit/server';
import { uiFont } from '@/shared/theme/fonts';
import { defaultMessages } from '@/shared/i18n/messages';
import { AppProviders } from '@/app/_providers/AppProviders/AppProviders';
import { NotFoundScreen } from '@/modules/profile/components/NotFoundScreen/NotFoundScreen';

export const metadata = { title: '404 · Те ещё люди.' };

export default async function GlobalNotFound() {
    const store = await cookies();
    const locale = store.get('PERSONS_LOCALE')?.value === 'en' ? 'en' : 'ru';
    await guardAccount(locale);
    const choice = store.get('PERSONS_THEME')?.value;
    const preference = choice === 'light' || choice === 'dark' ? choice : 'system';
    const systemTheme = store.get('PERSONS_SYSTEM_THEME')?.value === 'dark' ? 'dark' : 'light';
    const theme = preference === 'system' ? systemTheme : preference;

    return (
        <html lang={locale} className={`${getRootClassName({ theme })} ${uiFont.variable}`}>
            <body>
                <AppProviders
                    locale={locale}
                    messages={defaultMessages[locale]}
                    preference={preference}
                    resolvedTheme={theme}
                >
                    <NotFoundScreen />
                </AppProviders>
            </body>
        </html>
    );
}
